/// <reference types="vitest/globals" />

import {
  calcDiminishingMonthlyPayment,
  calcDiminishingSchedule,
  calcRemainingBalance,
} from '../diminishing'

describe('calcDiminishingMonthlyPayment', () => {
  it('₱30,000 at 5% for 12 months — matches amortization formula', () => {
    const principal = 3000000
    const rate = 0.05
    const n = 12
    const factor = (1 + rate) ** n
    const expected = Math.round((principal * rate * factor) / (factor - 1))
    expect(calcDiminishingMonthlyPayment(principal, rate, n)).toBe(expected)
    expect(expected).toBeGreaterThan(0)
  })

  it('₱50,000 at 5% for 24 months — matches amortization formula', () => {
    const principal = 5000000
    const rate = 0.05
    const n = 24
    const factor = (1 + rate) ** n
    const expected = Math.round((principal * rate * factor) / (factor - 1))
    expect(calcDiminishingMonthlyPayment(principal, rate, n)).toBe(expected)
    expect(expected).toBeGreaterThan(0)
  })

  it('rate of 0% returns exactly principal / termMonths', () => {
    expect(calcDiminishingMonthlyPayment(1200000, 0, 12)).toBe(100000)
    expect(calcDiminishingMonthlyPayment(3000000, 0, 3)).toBe(1000000)
  })

  it('returns an integer', () => {
    expect(Number.isInteger(calcDiminishingMonthlyPayment(3000000, 0.05, 12))).toBe(true)
    expect(Number.isInteger(calcDiminishingMonthlyPayment(5000000, 0.05, 24))).toBe(true)
    expect(Number.isInteger(calcDiminishingMonthlyPayment(1550000, 0.05, 6))).toBe(true)
  })

  it('always > 0 when principal > 0', () => {
    expect(calcDiminishingMonthlyPayment(3000000, 0.05, 12)).toBeGreaterThan(0)
    expect(calcDiminishingMonthlyPayment(100, 0.05, 1)).toBeGreaterThan(0)
    expect(calcDiminishingMonthlyPayment(3000000, 0, 12)).toBeGreaterThan(0)
  })
})

describe('calcDiminishingSchedule', () => {
  const baseParams = {
    principal: 3000000,
    rate: 0.05,
    termMonths: 3,
    startDate: '2026-03-25',
  }

  it('returns the correct number of periods', () => {
    const schedule = calcDiminishingSchedule(baseParams)
    expect(schedule).toHaveLength(3)
  })

  it('returns correct number of periods for different termMonths', () => {
    expect(calcDiminishingSchedule({ ...baseParams, termMonths: 12 })).toHaveLength(12)
    expect(calcDiminishingSchedule({ ...baseParams, termMonths: 24 })).toHaveLength(24)
  })

  it('period numbers are sequential starting at 1', () => {
    const schedule = calcDiminishingSchedule(baseParams)
    schedule.forEach((entry, index) => {
      expect(entry.periodNumber).toBe(index + 1)
    })
  })

  it('first period has the highest interestDue', () => {
    const schedule = calcDiminishingSchedule({ ...baseParams, termMonths: 12 })
    const maxInterest = Math.max(...schedule.map((e) => e.interestDue))
    expect(schedule[0].interestDue).toBe(maxInterest)
  })

  it('last period has the lowest interestDue', () => {
    const schedule = calcDiminishingSchedule({ ...baseParams, termMonths: 12 })
    const minInterest = Math.min(...schedule.map((e) => e.interestDue))
    expect(schedule[schedule.length - 1].interestDue).toBe(minInterest)
  })

  it('interestDue decreases monotonically across periods', () => {
    const schedule = calcDiminishingSchedule({ ...baseParams, termMonths: 12 })
    for (let i = 1; i < schedule.length; i++) {
      expect(schedule[i].interestDue).toBeLessThanOrEqual(schedule[i - 1].interestDue)
    }
  })

  it('principalDue increases monotonically across periods', () => {
    const schedule = calcDiminishingSchedule({ ...baseParams, termMonths: 12 })
    for (let i = 1; i < schedule.length; i++) {
      expect(schedule[i].principalDue).toBeGreaterThanOrEqual(schedule[i - 1].principalDue)
    }
  })

  it('last period balanceAfter === 0 exactly', () => {
    const schedule = calcDiminishingSchedule(baseParams)
    expect(schedule[schedule.length - 1].balanceAfter).toBe(0)
  })

  it('last period balanceAfter === 0 for longer terms', () => {
    const schedule = calcDiminishingSchedule({ ...baseParams, termMonths: 24 })
    expect(schedule[schedule.length - 1].balanceAfter).toBe(0)
  })

  it('all balanceAfter values are >= 0', () => {
    const schedule = calcDiminishingSchedule({ ...baseParams, termMonths: 12 })
    schedule.forEach((entry) => {
      expect(entry.balanceAfter).toBeGreaterThanOrEqual(0)
    })
  })

  it('sum of all principalDue === original principal (within ±1 centavo)', () => {
    const { principal } = baseParams
    const schedule = calcDiminishingSchedule(baseParams)
    const sumPrincipal = schedule.reduce((sum, e) => sum + e.principalDue, 0)
    expect(Math.abs(sumPrincipal - principal)).toBeLessThanOrEqual(1)
  })

  it('sum of all principalDue === original principal for 12-month loan', () => {
    const principal = 3000000
    const schedule = calcDiminishingSchedule({ ...baseParams, principal, termMonths: 12 })
    const sumPrincipal = schedule.reduce((sum, e) => sum + e.principalDue, 0)
    expect(Math.abs(sumPrincipal - principal)).toBeLessThanOrEqual(1)
  })

  it('total interest is less than equivalent flat loan interest', () => {
    const { principal, rate } = baseParams
    const dimSchedule = calcDiminishingSchedule({ ...baseParams, termMonths: 12 })
    const dimInterest = dimSchedule.reduce((sum, e) => sum + e.interestDue, 0)
    const flatInterest = principal * rate * 12
    expect(dimInterest).toBeLessThan(flatInterest)
  })

  it('totalDue === principalDue + interestDue for every period', () => {
    const schedule = calcDiminishingSchedule(baseParams)
    schedule.forEach((entry) => {
      expect(entry.totalDue).toBe(entry.principalDue + entry.interestDue)
    })
  })

  it('all amounts are integers', () => {
    const schedule = calcDiminishingSchedule(baseParams)
    schedule.forEach((entry) => {
      expect(Number.isInteger(entry.principalDue)).toBe(true)
      expect(Number.isInteger(entry.interestDue)).toBe(true)
      expect(Number.isInteger(entry.totalDue)).toBe(true)
      expect(Number.isInteger(entry.balanceAfter)).toBe(true)
    })
  })

  it('due dates increment by exactly 1 month each period', () => {
    const schedule = calcDiminishingSchedule(baseParams)
    expect(schedule[0].dueDate).toBe('2026-04-25')
    expect(schedule[1].dueDate).toBe('2026-05-25')
    expect(schedule[2].dueDate).toBe('2026-06-25')
  })

  it('due dates are valid YYYY-MM-DD strings', () => {
    const schedule = calcDiminishingSchedule(baseParams)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    schedule.forEach((entry) => {
      expect(entry.dueDate).toMatch(dateRegex)
      expect(new Date(entry.dueDate).toString()).not.toBe('Invalid Date')
    })
  })
})

describe('calcRemainingBalance', () => {
  const flatSchedule = calcDiminishingSchedule({
    principal: 3000000,
    rate: 0.05,
    termMonths: 3,
    startDate: '2026-03-25',
  })

  it('no payments recorded → returns original principal', () => {
    expect(calcRemainingBalance(flatSchedule, [])).toBe(3000000)
  })

  it('all payments recorded with full type → returns 0', () => {
    const payments = flatSchedule.map(() => ({
      amountPaid: 0,
      paymentType: 'full' as const,
    }))
    expect(calcRemainingBalance(flatSchedule, payments)).toBe(0)
  })

  it('all payments recorded with principal type → returns 0', () => {
    const payments = flatSchedule.map(() => ({
      amountPaid: 0,
      paymentType: 'principal' as const,
    }))
    expect(calcRemainingBalance(flatSchedule, payments)).toBe(0)
  })

  it('only interest payments recorded → returns original principal unchanged', () => {
    const payments = flatSchedule.map(() => ({
      amountPaid: 0,
      paymentType: 'interest' as const,
    }))
    expect(calcRemainingBalance(flatSchedule, payments)).toBe(3000000)
  })

  it('penalty payments do not reduce principal', () => {
    const payments = flatSchedule.map(() => ({
      amountPaid: 0,
      paymentType: 'penalty' as const,
    }))
    expect(calcRemainingBalance(flatSchedule, payments)).toBe(3000000)
  })

  it('partial payments → returns correct reduced balance', () => {
    // Record only first period payment (full type)
    const payments = [{ amountPaid: 0, paymentType: 'full' as const }]
    const remaining = calcRemainingBalance(flatSchedule, payments)
    const expected = 3000000 - flatSchedule[0].principalDue
    expect(remaining).toBe(expected)
  })

  it('never returns negative', () => {
    // More payments than schedule entries
    const payments = [
      ...flatSchedule.map(() => ({ amountPaid: 0, paymentType: 'full' as const })),
      { amountPaid: 9999999, paymentType: 'full' as const },
    ]
    expect(calcRemainingBalance(flatSchedule, payments)).toBe(0)
  })

  it('returns integer', () => {
    expect(Number.isInteger(calcRemainingBalance(flatSchedule, []))).toBe(true)
    const payments = [{ amountPaid: 0, paymentType: 'full' as const }]
    expect(Number.isInteger(calcRemainingBalance(flatSchedule, payments))).toBe(true)
  })
})
