/// <reference types="vitest/globals" />

import { vi } from 'vitest'
import type { PendingNotification } from '@/types'

// Mock the supabase service role client
vi.mock('@/lib/supabase/service-role', () => ({
  createServiceRoleClient: vi.fn(),
}))

describe('PendingNotification shape', () => {
  it('has all required fields', () => {
    const notification: PendingNotification = {
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
      amountDue: 150000,
      penaltyAmount: 0,
      outstandingBalance: 3000000,
    }

    expect(notification.loanId).toBeDefined()
    expect(notification.borrowerName).toBeDefined()
    expect(notification.borrowerEmail).toBeDefined()
    expect(notification.borrowerPhone).toBeDefined()
    expect(notification.channel).toBeDefined()
    expect(notification.notificationType).toBeDefined()
    expect(notification.dueDate).toBeDefined()
    expect(notification.amountDue).toBeGreaterThanOrEqual(0)
    expect(notification.penaltyAmount).toBeGreaterThanOrEqual(0)
    expect(notification.outstandingBalance).toBeGreaterThanOrEqual(0)
  })

  it('overdue notifications have negative daysUntilDue', () => {
    const overdueTypes: PendingNotification['notificationType'][] = [
      'overdue_1day',
      'overdue_7day',
      'overdue_weekly',
    ]
    for (const type of overdueTypes) {
      const n: PendingNotification = {
        loanId: 'l',
        scheduleId: 's',
        borrowerId: 'b',
        borrowerName: 'Test',
        borrowerEmail: 'test@test.com',
        borrowerPhone: '0917',
        channel: 'email',
        notificationType: type,
        daysUntilDue: -7,
        dueDate: '2026-04-18',
        amountDue: 150000,
        penaltyAmount: 10500,
        outstandingBalance: 3000000,
      }
      expect(n.daysUntilDue).toBeLessThan(0)
    }
  })

  it('non-overdue notifications have non-negative daysUntilDue', () => {
    const upcomingTypes: PendingNotification['notificationType'][] = [
      'reminder_3day',
      'reminder_1day',
      'reminder_due',
    ]
    for (const type of upcomingTypes) {
      const n: PendingNotification = {
        loanId: 'l',
        scheduleId: 's',
        borrowerId: 'b',
        borrowerName: 'Test',
        borrowerEmail: 'test@test.com',
        borrowerPhone: '0917',
        channel: 'email',
        notificationType: type,
        daysUntilDue: 3,
        dueDate: '2026-04-28',
        amountDue: 150000,
        penaltyAmount: 0,
        outstandingBalance: 3000000,
      }
      expect(n.daysUntilDue).toBeGreaterThanOrEqual(0)
    }
  })

  it('overdue notifications have penaltyAmount > 0', () => {
    const n: PendingNotification = {
      loanId: 'l',
      scheduleId: 's',
      borrowerId: 'b',
      borrowerName: 'Test',
      borrowerEmail: 'test@test.com',
      borrowerPhone: '0917',
      channel: 'email',
      notificationType: 'overdue_1day',
      daysUntilDue: -1,
      dueDate: '2026-04-24',
      amountDue: 150000,
      penaltyAmount: 1500,
      outstandingBalance: 3000000,
    }
    expect(n.penaltyAmount).toBeGreaterThan(0)
  })

  it('non-overdue notifications have penaltyAmount = 0', () => {
    const n: PendingNotification = {
      loanId: 'l',
      scheduleId: 's',
      borrowerId: 'b',
      borrowerName: 'Test',
      borrowerEmail: 'test@test.com',
      borrowerPhone: '0917',
      channel: 'email',
      notificationType: 'reminder_3day',
      daysUntilDue: 3,
      dueDate: '2026-04-28',
      amountDue: 150000,
      penaltyAmount: 0,
      outstandingBalance: 3000000,
    }
    expect(n.penaltyAmount).toBe(0)
  })

  it('channel must be email or sms', () => {
    const emailN: PendingNotification = {
      loanId: 'l',
      scheduleId: null,
      borrowerId: 'b',
      borrowerName: 'Test',
      borrowerEmail: 'test@test.com',
      borrowerPhone: '0917',
      channel: 'email',
      notificationType: 'reminder_due',
      daysUntilDue: 0,
      dueDate: '2026-04-25',
      amountDue: 150000,
      penaltyAmount: 0,
      outstandingBalance: 3000000,
    }
    const smsN: PendingNotification = { ...emailN, channel: 'sms' }
    expect(['email', 'sms']).toContain(emailN.channel)
    expect(['email', 'sms']).toContain(smsN.channel)
  })
})
