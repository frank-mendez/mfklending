/// <reference types="vitest/globals" />

import { currentMonthManila, daysOverdue, formatManila, isOverdue, todayManila } from '../date'

describe('formatManila', () => {
  it('formats a UTC date string in Manila time', () => {
    // 2026-01-15T02:00:00Z is Jan 15 10:00 AM Manila (UTC+8)
    const result = formatManila('2026-01-15T02:00:00Z', 'yyyy-MM-dd')
    expect(result).toBe('2026-01-15')
  })

  it('accepts a Date object', () => {
    const date = new Date('2026-01-15T00:00:00Z')
    const result = formatManila(date, 'yyyy-MM-dd')
    expect(typeof result).toBe('string')
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('applies the provided format string', () => {
    const result = formatManila('2026-01-15T02:00:00Z', 'MMM d, yyyy')
    expect(result).toBe('Jan 15, 2026')
  })

  it('handles naive date strings treated as UTC', () => {
    const result = formatManila('2026-03-25', 'yyyy-MM-dd')
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('todayManila', () => {
  it('returns a valid YYYY-MM-DD string', () => {
    const result = todayManila()
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('returns a valid date', () => {
    const result = todayManila()
    expect(new Date(result).toString()).not.toBe('Invalid Date')
  })

  it('returns the Manila date for a frozen UTC instant', () => {
    // 2026-03-28T20:00:00Z = 2026-03-29T04:00:00+08:00 Manila → next day
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-28T20:00:00Z'))
    expect(todayManila()).toBe('2026-03-29')
    vi.useRealTimers()
  })
})

describe('currentMonthManila', () => {
  it('returns a valid YYYY-MM string', () => {
    const result = currentMonthManila()
    expect(result).toMatch(/^\d{4}-\d{2}$/)
  })

  it('returns the Manila month for a frozen UTC instant crossing midnight', () => {
    // 2026-03-28T20:00:00Z = 2026-03-29T04:00:00+08:00 → March 2026 in Manila is already April... wait no
    // 2026-03-31T16:00:00Z = 2026-04-01T00:00:00+08:00 → April in Manila, still March UTC
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-31T16:00:00Z'))
    expect(currentMonthManila()).toBe('2026-04')
    vi.useRealTimers()
  })
})

// Freeze time to 2026-03-28T10:00:00+08:00 (= 02:00:00Z) for deterministic assertions.
// Manila today = '2026-03-28'
describe('isOverdue', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-28T02:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns true for a date strictly before today', () => {
    expect(isOverdue('2026-03-27')).toBe(true)
    expect(isOverdue('2026-01-01')).toBe(true)
  })

  it('returns false for today', () => {
    expect(isOverdue('2026-03-28')).toBe(false)
  })

  it('returns false for a future date', () => {
    expect(isOverdue('2026-03-29')).toBe(false)
    expect(isOverdue('2099-12-31')).toBe(false)
  })
})

describe('daysOverdue', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-28T02:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns exact day count for a past date', () => {
    expect(daysOverdue('2026-03-25')).toBe(3)
    expect(daysOverdue('2026-03-27')).toBe(1)
  })

  it('returns 0 for today', () => {
    expect(daysOverdue('2026-03-28')).toBe(0)
  })

  it('returns 0 for a future date', () => {
    expect(daysOverdue('2026-03-29')).toBe(0)
    expect(daysOverdue('2099-12-31')).toBe(0)
  })
})
