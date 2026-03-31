/// <reference types="vitest/globals" />

import { calcFlatTotalInterest } from '../flat-interest'
import {
  calcInterestOnBalance,
  calcOutstandingBalance,
  generateSchedule,
  getOverdueEntries,
  isLoanFullyPaid,
  summarizeSchedule,
} from '../schedule'

const flatParams = {
  loanType: 'flat_interest' as const,
  principal: 3000000,
  rate: 0.05,
  termMonths: 3,
  startDate: '2026-03-25',
}

const dimParams = {
  loanType: 'diminishing' as const,
  principal: 3000000,
  rate: 0.05,
  termMonths: 3,
  startDate: '2026-03-25',
}

describe('generateSchedule', () => {
  it('flat_interest loanType generates correct flat schedule', () => {
    const schedule = generateSchedule(flatParams)
    expect(schedule).toHaveLength(3)
    // Only last period has principalDue
    expect(schedule[0].principalDue).toBe(0)
    expect(schedule[1].principalDue).toBe(0)
    expect(schedule[2].principalDue).toBe(3000000)
    // All interest payments equal
    expect(schedule[0].interestDue).toBe(150000)
    expect(schedule[1].interestDue).toBe(150000)
    expect(schedule[2].interestDue).toBe(150000)
  })

  it('diminishing loanType generates correct diminishing schedule', () => {
    const schedule = generateSchedule(dimParams)
    expect(schedule).toHaveLength(3)
    // Diminishing: first period has highest interest
    expect(schedule[0].interestDue).toBeGreaterThan(schedule[2].interestDue)
    // Last period closes to 0
    expect(schedule[schedule.length - 1].balanceAfter).toBe(0)
  })

  it('unknown loanType throws an error', () => {
    expect(() =>
      generateSchedule({ ...flatParams, loanType: 'unknown' as 'flat_interest' })
    ).toThrow()
  })

  it('flat schedule has correct LoanScheduleEntry shape', () => {
    const schedule = generateSchedule(flatParams)
    for (const entry of schedule) {
      expect(typeof entry.periodNumber).toBe('number')
      expect(typeof entry.dueDate).toBe('string')
      expect(typeof entry.principalDue).toBe('number')
      expect(typeof entry.interestDue).toBe('number')
      expect(typeof entry.totalDue).toBe('number')
      expect(typeof entry.balanceAfter).toBe('number')
    }
  })

  it('diminishing schedule has correct LoanScheduleEntry shape', () => {
    const schedule = generateSchedule(dimParams)
    for (const entry of schedule) {
      expect(typeof entry.periodNumber).toBe('number')
      expect(typeof entry.dueDate).toBe('string')
      expect(typeof entry.principalDue).toBe('number')
      expect(typeof entry.interestDue).toBe('number')
      expect(typeof entry.totalDue).toBe('number')
      expect(typeof entry.balanceAfter).toBe('number')
    }
  })
})

describe('summarizeSchedule', () => {
  it('throws on empty schedule', () => {
    expect(() => summarizeSchedule([])).toThrow()
  })

  it('totalPrincipal equals original principal (flat)', () => {
    const summary = summarizeSchedule(generateSchedule(flatParams))
    expect(summary.totalPrincipal).toBe(3000000)
  })

  it('totalRepayment equals totalPrincipal + totalInterest', () => {
    const summary = summarizeSchedule(generateSchedule(flatParams))
    expect(summary.totalRepayment).toBe(summary.totalPrincipal + summary.totalInterest)
  })

  it('numberOfPeriods matches termMonths', () => {
    expect(summarizeSchedule(generateSchedule(flatParams)).numberOfPeriods).toBe(3)
    expect(
      summarizeSchedule(generateSchedule({ ...flatParams, termMonths: 12 })).numberOfPeriods
    ).toBe(12)
  })

  it('firstDueDate < lastDueDate', () => {
    const summary = summarizeSchedule(generateSchedule({ ...flatParams, termMonths: 3 }))
    expect(summary.firstDueDate < summary.lastDueDate).toBe(true)
  })

  it('flat totalInterest matches calcFlatTotalInterest', () => {
    const summary = summarizeSchedule(generateSchedule(flatParams))
    expect(summary.totalInterest).toBe(
      calcFlatTotalInterest(flatParams.principal, flatParams.rate, flatParams.termMonths)
    )
  })

  it('diminishing totalInterest is always less than flat totalInterest for same loan', () => {
    const flatSummary = summarizeSchedule(generateSchedule({ ...flatParams, termMonths: 12 }))
    const dimSummary = summarizeSchedule(generateSchedule({ ...dimParams, termMonths: 12 }))
    expect(dimSummary.totalInterest).toBeLessThan(flatSummary.totalInterest)
  })
})

describe('getOverdueEntries', () => {
  // All schedule periods: due 2026-04-25, 2026-05-25, 2026-06-25
  const schedule = generateSchedule(flatParams)

  it('no overdue entries when all periods are in the future', () => {
    // asOfDate before any due date
    const overdue = getOverdueEntries(schedule, [], '2026-04-24')
    expect(overdue).toHaveLength(0)
  })

  it('returns correct entries when some periods are past due', () => {
    // asOfDate is 2026-05-01: period 1 (due 2026-04-25) is overdue
    const overdue = getOverdueEntries(schedule, [], '2026-05-01')
    expect(overdue).toHaveLength(1)
    expect(overdue[0].dueDate).toBe('2026-04-25')
  })

  it('returns multiple overdue entries', () => {
    // asOfDate is 2026-06-01: periods 1 and 2 are overdue
    const overdue = getOverdueEntries(schedule, [], '2026-06-01')
    expect(overdue).toHaveLength(2)
  })

  it('daysLate is calculated correctly', () => {
    // Period 1 due 2026-04-25, asOfDate 2026-05-05 → 10 days late
    const overdue = getOverdueEntries(schedule, [], '2026-05-05')
    expect(overdue[0].daysLate).toBe(10)
  })

  it('penaltyAmount is calculated correctly', () => {
    // Period 1: interest = 150000, 10 days late → penalty = 10 * 0.01 * 150000 = 15000
    const overdue = getOverdueEntries(schedule, [], '2026-05-05')
    expect(overdue[0].penaltyAmount).toBe(15000)
  })

  it('paid entries are excluded even if past due date', () => {
    // Period 1 is past due but has a payment recorded → excluded
    const payments = [{ amountPaid: 150000, paymentType: 'interest' as const }]
    const overdue = getOverdueEntries(schedule, payments, '2026-05-05')
    expect(overdue).toHaveLength(0)
  })

  it('paid entries excluded, unpaid entries still appear', () => {
    // 2 periods past due, period 1 paid → only period 2 is overdue
    const payments = [{ amountPaid: 150000, paymentType: 'interest' as const }]
    const overdue = getOverdueEntries(schedule, payments, '2026-06-01')
    expect(overdue).toHaveLength(1)
    expect(overdue[0].dueDate).toBe('2026-05-25')
  })
})

describe('isLoanFullyPaid', () => {
  const schedule = generateSchedule(flatParams)

  it('returns false with no payments', () => {
    expect(isLoanFullyPaid(schedule, [])).toBe(false)
  })

  it('returns false with partial payments', () => {
    const payments = [
      { amountPaid: 150000, paymentType: 'interest' as const },
      { amountPaid: 150000, paymentType: 'interest' as const },
    ]
    expect(isLoanFullyPaid(schedule, payments)).toBe(false)
  })

  it('returns true when all payments recorded', () => {
    const payments = [
      { amountPaid: 150000, paymentType: 'interest' as const },
      { amountPaid: 150000, paymentType: 'interest' as const },
      { amountPaid: 3150000, paymentType: 'full' as const },
    ]
    expect(isLoanFullyPaid(schedule, payments)).toBe(true)
  })

  it('returns false if only interest paid but principal period not yet recorded', () => {
    // 2 interest-only periods paid, final principal period not recorded
    const payments = [
      { amountPaid: 150000, paymentType: 'interest' as const },
      { amountPaid: 150000, paymentType: 'interest' as const },
    ]
    expect(isLoanFullyPaid(schedule, payments)).toBe(false)
  })

  it('returns true for single-period loan with one payment', () => {
    const oneMonthSchedule = generateSchedule({ ...flatParams, termMonths: 1 })
    const payments = [{ amountPaid: 3150000, paymentType: 'full' as const }]
    expect(isLoanFullyPaid(oneMonthSchedule, payments)).toBe(true)
  })
})

describe('generateSchedule — hybrid_diminishing', () => {
  const hybridParams = {
    loanType: 'hybrid_diminishing' as const,
    principal: 20000000, // ₱200,000
    rate: 0.05,
    termMonths: 6,
    startDate: '2026-01-01',
  }

  it('returns a flat schedule (interest-only each period)', () => {
    const schedule = generateSchedule(hybridParams)
    expect(schedule).toHaveLength(6)
    // All periods: interest only, no principal due until final
    for (const entry of schedule.slice(0, 5)) {
      expect(entry.interestDue).toBe(1000000) // ₱200,000 × 5% = ₱10,000
    }
  })

  it('produces the same structure as flat_interest for equal params', () => {
    const flatSchedule = generateSchedule({ ...hybridParams, loanType: 'flat_interest' })
    const hybridSchedule = generateSchedule(hybridParams)
    expect(hybridSchedule).toEqual(flatSchedule)
  })
})

describe('calcOutstandingBalance', () => {
  it('returns full principal when there are no returns', () => {
    expect(calcOutstandingBalance(20000000, [])).toBe(20000000)
  })

  it('subtracts partial returns from the principal', () => {
    const returns = [{ amount: 500000 }, { amount: 500000 }, { amount: 500000 }]
    // ₱200,000 − 3×₱5,000 = ₱185,000
    expect(calcOutstandingBalance(20000000, returns)).toBe(18500000)
  })

  it('returns 0 when returns exactly equal the principal', () => {
    const returns = [{ amount: 10000000 }, { amount: 10000000 }]
    expect(calcOutstandingBalance(20000000, returns)).toBe(0)
  })

  it('floors at 0 — never returns negative', () => {
    const returns = [{ amount: 25000000 }] // return > principal
    expect(calcOutstandingBalance(20000000, returns)).toBe(0)
  })
})

describe('calcInterestOnBalance', () => {
  it('computes 5% of ₱200,000 → ₱10,000', () => {
    expect(calcInterestOnBalance(20000000, 0.05)).toBe(1000000)
  })

  it('computes interest after a ₱5,000 return: ₱195,000 × 5% = ₱9,750', () => {
    expect(calcInterestOnBalance(19500000, 0.05)).toBe(975000)
  })

  it('returns 0 when balance is 0', () => {
    expect(calcInterestOnBalance(0, 0.05)).toBe(0)
  })

  it('rounds to the nearest centavo', () => {
    // ₱1 outstanding at 5% = 0.05 centavos → rounds to 0
    expect(calcInterestOnBalance(1, 0.05)).toBe(0)
    // ₱10 outstanding at 5% = 0.5 centavos → rounds to 1
    expect(calcInterestOnBalance(10, 0.05)).toBe(1)
  })
})
