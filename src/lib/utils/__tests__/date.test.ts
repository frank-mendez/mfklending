/// <reference types="vitest/globals" />

import { daysOverdue, formatManila, isOverdue, todayManila } from '../date'

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
})

describe('isOverdue', () => {
  it('returns true for a past date', () => {
    expect(isOverdue('2020-01-01')).toBe(true)
    expect(isOverdue('2025-01-01')).toBe(true)
  })

  it('returns false for a future date', () => {
    expect(isOverdue('2099-12-31')).toBe(false)
  })
})

describe('daysOverdue', () => {
  it('returns 0 for a future date', () => {
    expect(daysOverdue('2099-12-31')).toBe(0)
  })

  it('returns a positive number for a past date', () => {
    const result = daysOverdue('2020-01-01')
    expect(result).toBeGreaterThan(0)
  })

  it('returns 0 when not overdue', () => {
    expect(daysOverdue('2099-01-01')).toBe(0)
  })
})
