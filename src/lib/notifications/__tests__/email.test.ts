/// <reference types="vitest/globals" />

import type { PartnerEscalation, PendingNotification } from '@/types'
import { buildBorrowerReminderEmail, buildPartnerEscalationEmail } from '../email'

function makeNotification(overrides: Partial<PendingNotification> = {}): PendingNotification {
  return {
    loanId: 'loan-1',
    scheduleId: 'sched-1',
    borrowerId: 'borrower-1',
    borrowerName: 'Maria Santos',
    borrowerEmail: 'maria@example.com',
    borrowerPhone: '09171234567',
    channel: 'email',
    notificationType: 'reminder_3day',
    daysUntilDue: 3,
    dueDate: '2026-04-25',
    amountDue: 150000, // ₱1,500.00
    penaltyAmount: 0,
    outstandingBalance: 3000000, // ₱30,000.00
    ...overrides,
  }
}

describe('buildBorrowerReminderEmail', () => {
  it('returns EmailPayload with to, subject, text, html fields', () => {
    const result = buildBorrowerReminderEmail(makeNotification())
    expect(result).toHaveProperty('to')
    expect(result).toHaveProperty('subject')
    expect(result).toHaveProperty('text')
    expect(result).toHaveProperty('html')
  })

  it('sets to = borrowerEmail', () => {
    const result = buildBorrowerReminderEmail(makeNotification())
    expect(result.to).toBe('maria@example.com')
  })

  describe('reminder_3day', () => {
    const n = makeNotification({ notificationType: 'reminder_3day', daysUntilDue: 3 })

    it('subject contains amount', () => {
      expect(buildBorrowerReminderEmail(n).subject).toContain('₱1,500.00')
    })

    it('body contains borrower first name', () => {
      expect(buildBorrowerReminderEmail(n).text).toContain('Maria')
    })

    it('body says "3 days from now"', () => {
      expect(buildBorrowerReminderEmail(n).text).toContain('3 days from now')
    })

    it('body contains GoTyme account 014721202843', () => {
      expect(buildBorrowerReminderEmail(n).text).toContain('014721202843')
    })

    it('body contains outstanding balance in pesos format', () => {
      expect(buildBorrowerReminderEmail(n).text).toContain('₱30,000.00')
    })
  })

  describe('reminder_1day', () => {
    const n = makeNotification({ notificationType: 'reminder_1day', daysUntilDue: 1 })

    it('body says "1 day from now"', () => {
      expect(buildBorrowerReminderEmail(n).text).toContain('1 day from now')
    })

    it('body contains GoTyme account 014721202843', () => {
      expect(buildBorrowerReminderEmail(n).text).toContain('014721202843')
    })
  })

  describe('reminder_due', () => {
    const n = makeNotification({ notificationType: 'reminder_due', daysUntilDue: 0 })

    it('subject says "Due Today"', () => {
      expect(buildBorrowerReminderEmail(n).subject).toContain('Due Today')
    })

    it('body says "TODAY"', () => {
      expect(buildBorrowerReminderEmail(n).text).toContain('TODAY')
    })

    it('body contains GoTyme account 014721202843', () => {
      expect(buildBorrowerReminderEmail(n).text).toContain('014721202843')
    })
  })

  describe('overdue_1day', () => {
    const n = makeNotification({
      notificationType: 'overdue_1day',
      daysUntilDue: -1,
      penaltyAmount: 1500, // ₱15.00 (1 day × 1% × ₱1500)
    })

    it('subject contains "Overdue"', () => {
      expect(buildBorrowerReminderEmail(n).subject).toContain('Overdue')
    })

    it('body contains "overdue"', () => {
      expect(buildBorrowerReminderEmail(n).text.toLowerCase()).toContain('overdue')
    })

    it('body contains penalty amount', () => {
      expect(buildBorrowerReminderEmail(n).text).toContain('₱15.00')
    })

    it('body contains GoTyme account 014721202843', () => {
      expect(buildBorrowerReminderEmail(n).text).toContain('014721202843')
    })
  })

  describe('overdue_7day', () => {
    const n = makeNotification({
      notificationType: 'overdue_7day',
      daysUntilDue: -7,
      penaltyAmount: 10500, // ₱105.00 (7 days × 1% × ₱1500)
    })

    it('subject contains "URGENT"', () => {
      expect(buildBorrowerReminderEmail(n).subject).toContain('URGENT')
    })

    it('subject contains "7" days overdue', () => {
      expect(buildBorrowerReminderEmail(n).subject).toContain('7')
    })

    it('body contains GoTyme account 014721202843', () => {
      expect(buildBorrowerReminderEmail(n).text).toContain('014721202843')
    })
  })

  describe('overdue_weekly', () => {
    const n = makeNotification({
      notificationType: 'overdue_weekly',
      daysUntilDue: -14,
      penaltyAmount: 21000,
    })

    it('subject contains "URGENT"', () => {
      expect(buildBorrowerReminderEmail(n).subject).toContain('URGENT')
    })

    it('body contains GoTyme account 014721202843', () => {
      expect(buildBorrowerReminderEmail(n).text).toContain('014721202843')
    })
  })

  it('never shows raw centavo numbers (all amounts have ₱ prefix)', () => {
    const n = makeNotification({ amountDue: 150000, outstandingBalance: 3000000 })
    const { text } = buildBorrowerReminderEmail(n)
    // 150000 raw number should not appear; ₱1,500.00 should
    expect(text).not.toContain('150000')
    expect(text).toContain('₱')
  })
})

describe('buildPartnerEscalationEmail', () => {
  const escalations: PartnerEscalation[] = [
    {
      loanId: 'loan-1',
      borrowerName: 'Jose Rizal',
      daysOverdue: 10,
      totalOverdueAmount: 300000, // ₱3,000.00
      penaltyAccrued: 45000, // ₱450.00
      scheduleEntries: [
        { period: 1, dueDate: '2026-03-25', amountDue: 150000, daysLate: 10, penalty: 15000 },
      ],
    },
    {
      loanId: 'loan-2',
      borrowerName: 'Andres Bonifacio',
      daysOverdue: 21,
      totalOverdueAmount: 500000,
      penaltyAccrued: 150000,
      scheduleEntries: [
        { period: 2, dueDate: '2026-03-10', amountDue: 250000, daysLate: 21, penalty: 52500 },
      ],
    },
  ]
  const partnerEmails = ['frank@mfk.com', 'kim@mfk.com', 'francis@mfk.com']

  it('subject contains loan count', () => {
    const { subject } = buildPartnerEscalationEmail(escalations, partnerEmails)
    expect(subject).toContain('2')
  })

  it('subject contains "Overdue"', () => {
    const { subject } = buildPartnerEscalationEmail(escalations, partnerEmails)
    expect(subject.toLowerCase()).toContain('overdue')
  })

  it('body lists first borrower name', () => {
    const { text } = buildPartnerEscalationEmail(escalations, partnerEmails)
    expect(text).toContain('Jose Rizal')
  })

  it('body lists second borrower name', () => {
    const { text } = buildPartnerEscalationEmail(escalations, partnerEmails)
    expect(text).toContain('Andres Bonifacio')
  })

  it('body contains total overdue amounts in peso format', () => {
    const { text } = buildPartnerEscalationEmail(escalations, partnerEmails)
    expect(text).toContain('₱3,000.00')
  })
})
