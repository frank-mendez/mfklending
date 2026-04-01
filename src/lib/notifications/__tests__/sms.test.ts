/// <reference types="vitest/globals" />

import type { PendingNotification } from '@/types'
import { buildBorrowerReminderSMS, normalizePhPhone } from '../sms'

function makeNotification(overrides: Partial<PendingNotification> = {}): PendingNotification {
  return {
    loanId: 'loan-1',
    scheduleId: 'sched-1',
    borrowerId: 'borrower-1',
    borrowerName: 'Maria Santos',
    borrowerEmail: 'maria@example.com',
    borrowerPhone: '09171234567',
    channel: 'sms',
    notificationType: 'reminder_3day',
    daysUntilDue: 3,
    dueDate: '2026-04-25',
    amountDue: 150000,
    penaltyAmount: 0,
    outstandingBalance: 3000000,
    ...overrides,
  }
}

describe('normalizePhPhone', () => {
  it('"09851234567" stays as-is', () => {
    expect(normalizePhPhone('09851234567')).toBe('09851234567')
  })

  it('"+639851234567" → "09851234567"', () => {
    expect(normalizePhPhone('+639851234567')).toBe('09851234567')
  })

  it('"639851234567" → "09851234567"', () => {
    expect(normalizePhPhone('639851234567')).toBe('09851234567')
  })

  it('"0985 228 9663" → "09852289663" (spaces removed)', () => {
    expect(normalizePhPhone('0985 228 9663')).toBe('09852289663')
  })

  it('"0985-228-9663" → "09852289663" (dashes removed)', () => {
    expect(normalizePhPhone('0985-228-9663')).toBe('09852289663')
  })
})

describe('buildBorrowerReminderSMS', () => {
  const allTypes: Array<PendingNotification['notificationType']> = [
    'reminder_3day',
    'reminder_1day',
    'reminder_due',
    'overdue_1day',
    'overdue_7day',
    'overdue_weekly',
  ]

  it.each(allTypes)('%s: message is ≤ 160 characters', (type) => {
    const daysUntilDue = type.startsWith('overdue') ? -7 : type === 'reminder_due' ? 0 : 3
    const n = makeNotification({
      notificationType: type,
      daysUntilDue,
      penaltyAmount: type.startsWith('overdue') ? 10500 : 0,
      borrowerName: 'Maria Kristina Santos Dela Cruz', // long name test
    })
    const msg = buildBorrowerReminderSMS(n)
    expect(msg.length).toBeLessThanOrEqual(160)
  })

  it('uses first name only (not full name)', () => {
    const n = makeNotification({ borrowerName: 'Maria Santos' })
    const msg = buildBorrowerReminderSMS(n)
    expect(msg).toContain('Maria')
    expect(msg).not.toContain('Maria Santos')
  })

  it('contains formatted amount (₱ prefix)', () => {
    const n = makeNotification({ amountDue: 150000 })
    const msg = buildBorrowerReminderSMS(n)
    expect(msg).toContain('₱')
    expect(msg).not.toContain('150000')
  })

  it('contains GoTyme account number 014721202843', () => {
    const n = makeNotification()
    const msg = buildBorrowerReminderSMS(n)
    expect(msg).toContain('014721202843')
  })

  it('overdue types contain days count or "overdue"', () => {
    const n = makeNotification({
      notificationType: 'overdue_1day',
      daysUntilDue: -1,
      penaltyAmount: 1500,
    })
    const msg = buildBorrowerReminderSMS(n)
    expect(msg.toLowerCase()).toMatch(/overdue|1 day/)
  })

  it('overdue message always includes GoTyme account number before truncation point', () => {
    // Even with a long borrower name and large amounts, account number must be present
    const n = makeNotification({
      notificationType: 'overdue_weekly',
      daysUntilDue: -21,
      penaltyAmount: 315000, // ₱3,150.00
      amountDue: 1500000, // ₱15,000.00
      borrowerName: 'Rosario Constantino Villanueva',
    })
    const msg = buildBorrowerReminderSMS(n)
    expect(msg).toContain('014721202843')
    expect(msg.length).toBeLessThanOrEqual(160)
  })
})
