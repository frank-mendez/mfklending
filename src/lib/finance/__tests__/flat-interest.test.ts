/// <reference types="vitest/globals" />

import {
  calcFlatSchedule,
  calcFlatTotalInterest,
  calcFlatTotalRepayment,
  calcMonthlyInterest,
} from '../flat-interest'

describe('calcMonthlyInterest', () => {
  it('₱30,000 at 5% → ₱1,500 (150000 centavos)', () => {
    expect(calcMonthlyInterest(3000000, 0.05)).toBe(150000)
  })

  it('₱10,000 at 5% → ₱500 (50000 centavos)', () => {
    expect(calcMonthlyInterest(1000000, 0.05)).toBe(50000)
  })

  it('₱50,000 at 5% → ₱2,500 (250000 centavos)', () => {
    expect(calcMonthlyInterest(5000000, 0.05)).toBe(250000)
  })

  it('₱15,500 at 5% → ₱775 (77500 centavos) — non-round principal', () => {
    expect(calcMonthlyInterest(1550000, 0.05)).toBe(77500)
  })

  it('rate of 0% → 0', () => {
    expect(calcMonthlyInterest(3000000, 0)).toBe(0)
  })

  it('principal of 0 → 0', () => {
    expect(calcMonthlyInterest(0, 0.05)).toBe(0)
  })

  it('returns an integer (no fractional centavos)', () => {
    expect(Number.isInteger(calcMonthlyInterest(3000000, 0.05))).toBe(true)
    expect(Number.isInteger(calcMonthlyInterest(1550000, 0.05))).toBe(true)
    expect(Number.isInteger(calcMonthlyInterest(333333, 0.05))).toBe(true)
  })
})

describe('calcFlatTotalRepayment', () => {
  it('₱30,000 at 5% for 3 months → ₱34,500 (3450000 centavos)', () => {
    expect(calcFlatTotalRepayment(3000000, 0.05, 3)).toBe(3450000)
  })

  it('₱10,000 at 5% for 3 months → ₱11,500 (1150000 centavos)', () => {
    expect(calcFlatTotalRepayment(1000000, 0.05, 3)).toBe(1150000)
  })

  it('₱30,000 at 5% for 1 month → ₱31,500 (3150000 centavos)', () => {
    expect(calcFlatTotalRepayment(3000000, 0.05, 1)).toBe(3150000)
  })

  it('₱30,000 at 5% for 6 months → ₱39,000 (3900000 centavos)', () => {
    expect(calcFlatTotalRepayment(3000000, 0.05, 6)).toBe(3900000)
  })

  it('always greater than principal when rate > 0', () => {
    const principal = 3000000
    expect(calcFlatTotalRepayment(principal, 0.05, 3)).toBeGreaterThan(principal)
    expect(calcFlatTotalRepayment(principal, 0.01, 1)).toBeGreaterThan(principal)
  })

  it('returns an integer', () => {
    expect(Number.isInteger(calcFlatTotalRepayment(3000000, 0.05, 3))).toBe(true)
    expect(Number.isInteger(calcFlatTotalRepayment(1550000, 0.05, 3))).toBe(true)
  })
})

describe('calcFlatTotalInterest', () => {
  it('₱30,000 at 5% for 3 months → ₱4,500 (450000 centavos)', () => {
    expect(calcFlatTotalInterest(3000000, 0.05, 3)).toBe(450000)
  })

  it('₱10,000 at 5% for 3 months → ₱1,500 (150000 centavos)', () => {
    expect(calcFlatTotalInterest(1000000, 0.05, 3)).toBe(150000)
  })

  it('equals calcFlatTotalRepayment minus principal', () => {
    const principal = 3000000
    const rate = 0.05
    const termMonths = 3
    expect(calcFlatTotalInterest(principal, rate, termMonths)).toBe(
      calcFlatTotalRepayment(principal, rate, termMonths) - principal
    )
  })

  it('returns an integer', () => {
    expect(Number.isInteger(calcFlatTotalInterest(3000000, 0.05, 3))).toBe(true)
    expect(Number.isInteger(calcFlatTotalInterest(1550000, 0.05, 3))).toBe(true)
  })
})

describe('calcFlatSchedule', () => {
  const baseParams = {
    principal: 3000000,
    rate: 0.05,
    termMonths: 3,
    startDate: '2026-03-25',
  }

  it('returns the correct number of periods (termMonths entries)', () => {
    const schedule = calcFlatSchedule(baseParams)
    expect(schedule).toHaveLength(3)
  })

  it('returns correct number of periods for different termMonths', () => {
    expect(calcFlatSchedule({ ...baseParams, termMonths: 1 })).toHaveLength(1)
    expect(calcFlatSchedule({ ...baseParams, termMonths: 6 })).toHaveLength(6)
  })

  it('period numbers are sequential starting at 1', () => {
    const schedule = calcFlatSchedule(baseParams)
    schedule.forEach((entry, index) => {
      expect(entry.periodNumber).toBe(index + 1)
    })
  })

  it('only the last period has principalDue > 0', () => {
    const schedule = calcFlatSchedule(baseParams)
    const nonFinal = schedule.slice(0, -1)
    const final = schedule[schedule.length - 1]
    nonFinal.forEach((entry) => {
      expect(entry.principalDue).toBe(0)
    })
    expect(final.principalDue).toBeGreaterThan(0)
  })

  it('last period principalDue equals the original principal', () => {
    const schedule = calcFlatSchedule(baseParams)
    const final = schedule[schedule.length - 1]
    expect(final.principalDue).toBe(baseParams.principal)
  })

  it('all periods have the same interestDue amount', () => {
    const schedule = calcFlatSchedule(baseParams)
    const expectedInterest = calcMonthlyInterest(baseParams.principal, baseParams.rate)
    schedule.forEach((entry) => {
      expect(entry.interestDue).toBe(expectedInterest)
    })
  })

  it('last period balanceAfter === 0', () => {
    const schedule = calcFlatSchedule(baseParams)
    expect(schedule[schedule.length - 1].balanceAfter).toBe(0)
  })

  it('all non-last periods balanceAfter === principal', () => {
    const schedule = calcFlatSchedule(baseParams)
    const nonFinal = schedule.slice(0, -1)
    nonFinal.forEach((entry) => {
      expect(entry.balanceAfter).toBe(baseParams.principal)
    })
  })

  it('totalDue === principalDue + interestDue for every period', () => {
    const schedule = calcFlatSchedule(baseParams)
    schedule.forEach((entry) => {
      expect(entry.totalDue).toBe(entry.principalDue + entry.interestDue)
    })
  })

  it('due dates increment by exactly 1 month each period', () => {
    const schedule = calcFlatSchedule(baseParams)
    expect(schedule[0].dueDate).toBe('2026-04-25')
    expect(schedule[1].dueDate).toBe('2026-05-25')
    expect(schedule[2].dueDate).toBe('2026-06-25')
  })

  it('due dates are valid YYYY-MM-DD strings', () => {
    const schedule = calcFlatSchedule(baseParams)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    schedule.forEach((entry) => {
      expect(entry.dueDate).toMatch(dateRegex)
      expect(new Date(entry.dueDate).toString()).not.toBe('Invalid Date')
    })
  })

  it('sum of all totalDue equals calcFlatTotalRepayment', () => {
    const { principal, rate, termMonths } = baseParams
    const schedule = calcFlatSchedule(baseParams)
    const sumTotal = schedule.reduce((acc, entry) => acc + entry.totalDue, 0)
    expect(sumTotal).toBe(calcFlatTotalRepayment(principal, rate, termMonths))
  })

  it('all amounts are integers (no fractional centavos)', () => {
    const schedule = calcFlatSchedule(baseParams)
    schedule.forEach((entry) => {
      expect(Number.isInteger(entry.principalDue)).toBe(true)
      expect(Number.isInteger(entry.interestDue)).toBe(true)
      expect(Number.isInteger(entry.totalDue)).toBe(true)
      expect(Number.isInteger(entry.balanceAfter)).toBe(true)
    })
  })
})
