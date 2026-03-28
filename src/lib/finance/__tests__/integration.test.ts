/// <reference types="vitest/globals" />

/**
 * Integration tests for the MFK Lending finance engine.
 *
 * These tests simulate complete real-world loan scenarios end-to-end
 * using MFK's actual business numbers.
 */

// Import from the public index to verify the unified export works end-to-end
import {
  calcAccruedPenalty,
  calcFlatTotalInterest,
  calcFlatTotalRepayment,
  calcLatePenalty,
  calcMonthlyInterest,
  calcRemainingBalance,
  calcTotalAmountDue,
  generateSchedule,
  isLoanFullyPaid,
  summarizeSchedule,
} from '../index'

describe('Scenario 1 — Melca Ybañez flat loan (₱30,000, 5%, 3 months, disbursed 2026-03-25)', () => {
  const schedule = generateSchedule({
    loanType: 'flat_interest',
    principal: 3000000,
    rate: 0.05,
    termMonths: 3,
    startDate: '2026-03-25',
  })
  const summary = summarizeSchedule(schedule)

  it('schedule has exactly 3 entries', () => {
    expect(schedule).toHaveLength(3)
  })

  it('monthly interest = ₱1,500 (150000 centavos) every period', () => {
    for (const entry of schedule) {
      expect(entry.interestDue).toBe(150000)
    }
  })

  it('final period total = ₱31,500 (3150000 centavos)', () => {
    expect(schedule[2].totalDue).toBe(3150000)
  })

  it('grand total repayment = ₱34,500 (3450000 centavos)', () => {
    expect(summary.totalRepayment).toBe(3450000)
    expect(summary.totalRepayment).toBe(calcFlatTotalRepayment(3000000, 0.05, 3))
  })

  it('total interest = ₱4,500 (450000 centavos)', () => {
    expect(summary.totalInterest).toBe(450000)
    expect(summary.totalInterest).toBe(calcFlatTotalInterest(3000000, 0.05, 3))
  })

  it('0 days late → penalty = 0', () => {
    const monthlyInterest = calcMonthlyInterest(3000000, 0.05)
    expect(calcLatePenalty({ daysLate: 0, monthlyInterest })).toBe(0)
  })

  it('10 days late on period 1 → penalty = ₱150.00 (15000 centavos)', () => {
    const monthlyInterest = calcMonthlyInterest(3000000, 0.05)
    expect(calcLatePenalty({ daysLate: 10, monthlyInterest })).toBe(15000)
  })

  it('after recording all 3 payments → isLoanFullyPaid = true', () => {
    const payments = [
      { amountPaid: 150000, paymentType: 'interest' as const },
      { amountPaid: 150000, paymentType: 'interest' as const },
      { amountPaid: 3150000, paymentType: 'full' as const },
    ]
    expect(isLoanFullyPaid(schedule, payments)).toBe(true)
  })

  it('with only 2 interest payments → isLoanFullyPaid = false', () => {
    const payments = [
      { amountPaid: 150000, paymentType: 'interest' as const },
      { amountPaid: 150000, paymentType: 'interest' as const },
    ]
    expect(isLoanFullyPaid(schedule, payments)).toBe(false)
  })
})

describe('Scenario 2 — Generic diminishing loan (₱50,000, 5%, 12 months)', () => {
  const principal = 5000000
  const schedule = generateSchedule({
    loanType: 'diminishing',
    principal,
    rate: 0.05,
    termMonths: 12,
    startDate: '2026-01-01',
  })
  const summary = summarizeSchedule(schedule)

  it('schedule has exactly 12 entries', () => {
    expect(schedule).toHaveLength(12)
  })

  it('balanceAfter on last period === 0', () => {
    expect(schedule[11].balanceAfter).toBe(0)
  })

  it('interestDue on period 1 > interestDue on period 12', () => {
    expect(schedule[0].interestDue).toBeGreaterThan(schedule[11].interestDue)
  })

  it('principalDue on period 1 < principalDue on period 12', () => {
    expect(schedule[0].principalDue).toBeLessThan(schedule[11].principalDue)
  })

  it('total diminishing interest is less than equivalent flat loan interest', () => {
    // Flat total interest: ₱50,000 × 5% × 12 = ₱30,000 = 3000000 centavos
    const flatTotalInterest = principal * 0.05 * 12
    expect(summary.totalInterest).toBeLessThan(flatTotalInterest)
  })

  it('sum of all principalDue = original principal (within ±1 centavo)', () => {
    expect(Math.abs(summary.totalPrincipal - principal)).toBeLessThanOrEqual(1)
  })
})

describe('Scenario 3 — Penalty accumulation (₱20,000, 5%, 3 months)', () => {
  // Monthly interest = ₱1,000 (100000 centavos)
  const principal = 2000000
  const rate = 0.05
  const monthlyInterest = calcMonthlyInterest(principal, rate)

  it('monthly interest = ₱1,000 (100000 centavos)', () => {
    expect(monthlyInterest).toBe(100000)
  })

  it('period 1 penalty (7 days late) = ₱70.00 (7000 centavos)', () => {
    expect(calcLatePenalty({ daysLate: 7, monthlyInterest })).toBe(7000)
  })

  it('period 2 penalty (0 days late) = 0', () => {
    expect(calcLatePenalty({ daysLate: 0, monthlyInterest })).toBe(0)
  })

  it('period 3 penalty (on time) = 0', () => {
    expect(calcLatePenalty({ daysLate: 0, monthlyInterest })).toBe(0)
  })

  it('total accrued penalty = ₱70.00 (7000 centavos)', () => {
    const total = calcAccruedPenalty({
      overdueEntries: [
        { daysLate: 7, monthlyInterest },
        { daysLate: 0, monthlyInterest },
        { daysLate: 0, monthlyInterest },
      ],
    })
    expect(total).toBe(7000)
  })

  it('total amount due = principal + unpaid interest + penalty', () => {
    const totalDue = calcTotalAmountDue({
      outstandingPrincipal: principal,
      unpaidInterest: monthlyInterest,
      accruedPenalties: 7000,
    })
    expect(totalDue).toBe(principal + monthlyInterest + 7000)
  })
})

describe('Scenario 4 — Edge cases', () => {
  it('zero-term loan (termMonths = 0) returns empty schedule', () => {
    const schedule = generateSchedule({
      loanType: 'flat_interest',
      principal: 3000000,
      rate: 0.05,
      termMonths: 0,
      startDate: '2026-01-01',
    })
    expect(schedule).toHaveLength(0)
  })

  it('principal of 0 → all payments are 0', () => {
    const schedule = generateSchedule({
      loanType: 'flat_interest',
      principal: 0,
      rate: 0.05,
      termMonths: 3,
      startDate: '2026-01-01',
    })
    for (const entry of schedule) {
      expect(entry.principalDue).toBe(0)
      expect(entry.interestDue).toBe(0)
      expect(entry.totalDue).toBe(0)
    }
  })

  it('very large loan ₱500,000 at 5% for 24 months — all values are integers', () => {
    const schedule = generateSchedule({
      loanType: 'diminishing',
      principal: 50000000,
      rate: 0.05,
      termMonths: 24,
      startDate: '2026-01-01',
    })
    for (const entry of schedule) {
      expect(Number.isInteger(entry.principalDue)).toBe(true)
      expect(Number.isInteger(entry.interestDue)).toBe(true)
      expect(Number.isInteger(entry.totalDue)).toBe(true)
      expect(Number.isInteger(entry.balanceAfter)).toBe(true)
    }
  })

  it('very large loan — final balance === 0 (no floating point errors)', () => {
    const schedule = generateSchedule({
      loanType: 'diminishing',
      principal: 50000000,
      rate: 0.05,
      termMonths: 24,
      startDate: '2026-01-01',
    })
    expect(schedule[schedule.length - 1].balanceAfter).toBe(0)
  })

  it('very large loan — sum of principalDue = original principal', () => {
    const principal = 50000000
    const schedule = generateSchedule({
      loanType: 'diminishing',
      principal,
      rate: 0.05,
      termMonths: 24,
      startDate: '2026-01-01',
    })
    const sumPrincipal = schedule.reduce((sum, e) => sum + e.principalDue, 0)
    expect(Math.abs(sumPrincipal - principal)).toBeLessThanOrEqual(1)
  })

  it('calcRemainingBalance returns 0 after all payments for diminishing loan', () => {
    const schedule = generateSchedule({
      loanType: 'diminishing',
      principal: 3000000,
      rate: 0.05,
      termMonths: 3,
      startDate: '2026-01-01',
    })
    const payments = schedule.map(() => ({
      amountPaid: 0,
      paymentType: 'full' as const,
    }))
    expect(calcRemainingBalance(schedule, payments)).toBe(0)
  })
})
