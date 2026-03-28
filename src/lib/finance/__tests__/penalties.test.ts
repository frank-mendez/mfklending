/// <reference types="vitest/globals" />

import {
  calcAccruedPenalty,
  calcDaysOverdue,
  calcLatePenalty,
  calcTotalAmountDue,
} from '../penalties'

describe('calcLatePenalty', () => {
  it('0 days late → 0', () => {
    expect(calcLatePenalty({ daysLate: 0, monthlyInterest: 150000 })).toBe(0)
  })

  it('1 day late on ₱1,500 interest → ₱15.00 (1500 centavos)', () => {
    expect(calcLatePenalty({ daysLate: 1, monthlyInterest: 150000 })).toBe(1500)
  })

  it('5 days late on ₱1,500 interest → ₱75.00 (7500 centavos)', () => {
    expect(calcLatePenalty({ daysLate: 5, monthlyInterest: 150000 })).toBe(7500)
  })

  it('10 days late on ₱1,500 interest → ₱150.00 (15000 centavos)', () => {
    expect(calcLatePenalty({ daysLate: 10, monthlyInterest: 150000 })).toBe(15000)
  })

  it('30 days late on ₱1,500 interest → ₱450.00 (45000 centavos)', () => {
    expect(calcLatePenalty({ daysLate: 30, monthlyInterest: 150000 })).toBe(45000)
  })

  it('negative daysLate → 0', () => {
    expect(calcLatePenalty({ daysLate: -1, monthlyInterest: 150000 })).toBe(0)
    expect(calcLatePenalty({ daysLate: -30, monthlyInterest: 150000 })).toBe(0)
  })

  it('returns an integer', () => {
    expect(Number.isInteger(calcLatePenalty({ daysLate: 5, monthlyInterest: 150000 }))).toBe(true)
    expect(Number.isInteger(calcLatePenalty({ daysLate: 7, monthlyInterest: 333333 }))).toBe(true)
  })

  it('penalty is on interest amount, not principal — changing principal does not affect penalty', () => {
    const interest = 150000
    const penalty5days = calcLatePenalty({ daysLate: 5, monthlyInterest: interest })
    // The same interest amount with any "principal" yields the same penalty
    // Verify by checking the formula: daysLate * 0.01 * monthlyInterest
    expect(penalty5days).toBe(Math.round(5 * 0.01 * interest))
    // Double interest → double penalty (not double principal)
    expect(calcLatePenalty({ daysLate: 5, monthlyInterest: interest * 2 })).toBe(penalty5days * 2)
  })

  it('penalty on ₱500 interest (₱10,000 principal equivalent) is different from ₱1,500', () => {
    const penaltySmall = calcLatePenalty({ daysLate: 5, monthlyInterest: 50000 })
    const penaltyLarge = calcLatePenalty({ daysLate: 5, monthlyInterest: 150000 })
    expect(penaltySmall).not.toBe(penaltyLarge)
    expect(penaltySmall).toBe(2500) // 5 * 0.01 * 50000
  })
})

describe('calcAccruedPenalty', () => {
  it('empty array → 0', () => {
    expect(calcAccruedPenalty({ overdueEntries: [] })).toBe(0)
  })

  it('single overdue entry matches calcLatePenalty', () => {
    const entry = { daysLate: 5, monthlyInterest: 150000 }
    expect(calcAccruedPenalty({ overdueEntries: [entry] })).toBe(calcLatePenalty(entry))
  })

  it('multiple entries → sum of individual penalties', () => {
    const entries = [
      { daysLate: 5, monthlyInterest: 150000 },
      { daysLate: 10, monthlyInterest: 150000 },
      { daysLate: 0, monthlyInterest: 150000 },
    ]
    const expected = entries.reduce((sum, e) => sum + calcLatePenalty(e), 0)
    expect(calcAccruedPenalty({ overdueEntries: entries })).toBe(expected)
  })

  it('entries with 0 daysLate contribute 0', () => {
    const entries = [
      { daysLate: 0, monthlyInterest: 150000 },
      { daysLate: 0, monthlyInterest: 150000 },
    ]
    expect(calcAccruedPenalty({ overdueEntries: entries })).toBe(0)
  })

  it('returns an integer', () => {
    const entries = [
      { daysLate: 7, monthlyInterest: 333333 },
      { daysLate: 3, monthlyInterest: 100000 },
    ]
    expect(Number.isInteger(calcAccruedPenalty({ overdueEntries: entries }))).toBe(true)
  })
})

describe('calcTotalAmountDue', () => {
  it('all zeros → 0', () => {
    expect(
      calcTotalAmountDue({ outstandingPrincipal: 0, unpaidInterest: 0, accruedPenalties: 0 })
    ).toBe(0)
  })

  it('principal only (no interest, no penalties) → returns principal', () => {
    expect(
      calcTotalAmountDue({ outstandingPrincipal: 3000000, unpaidInterest: 0, accruedPenalties: 0 })
    ).toBe(3000000)
  })

  it('principal + interest → correct sum', () => {
    expect(
      calcTotalAmountDue({
        outstandingPrincipal: 3000000,
        unpaidInterest: 150000,
        accruedPenalties: 0,
      })
    ).toBe(3150000)
  })

  it('principal + interest + penalties → correct sum', () => {
    expect(
      calcTotalAmountDue({
        outstandingPrincipal: 3000000,
        unpaidInterest: 150000,
        accruedPenalties: 7500,
      })
    ).toBe(3157500)
  })

  it('returns an integer', () => {
    const result = calcTotalAmountDue({
      outstandingPrincipal: 3000000,
      unpaidInterest: 150000,
      accruedPenalties: 7500,
    })
    expect(Number.isInteger(result)).toBe(true)
  })
})

describe('calcDaysOverdue', () => {
  it('same date → 0', () => {
    expect(calcDaysOverdue('2026-04-25', '2026-04-25')).toBe(0)
  })

  it('1 day after due date → 1', () => {
    expect(calcDaysOverdue('2026-04-25', '2026-04-26')).toBe(1)
  })

  it('30 days after due date → 30', () => {
    expect(calcDaysOverdue('2026-04-25', '2026-05-25')).toBe(30)
  })

  it('asOfDate before due date → 0', () => {
    expect(calcDaysOverdue('2026-04-25', '2026-04-20')).toBe(0)
    expect(calcDaysOverdue('2026-04-25', '2026-01-01')).toBe(0)
  })

  it('cross month boundary — Jan 31 to Mar 1', () => {
    expect(calcDaysOverdue('2026-01-31', '2026-03-01')).toBe(29)
  })

  it('cross year boundary — Dec 25 to Jan 5', () => {
    expect(calcDaysOverdue('2025-12-25', '2026-01-05')).toBe(11)
  })

  it('never returns negative', () => {
    expect(calcDaysOverdue('2026-12-31', '2026-01-01')).toBe(0)
  })
})
