// TODO: Replace console.error with Sentry.captureException() once @sentry/nextjs is installed.
import { formatPHP } from '@/lib/utils/currency'
import { formatManila } from '@/lib/utils/date'
import type { PendingNotification } from '@/types'

const SEMAPHORE_API_URL = 'https://api.semaphore.co/api/v4/messages'
const SEMAPHORE_SENDER = process.env.SEMAPHORE_SENDER_NAME ?? 'MFKLending'

/** Normalizes a Philippine mobile number to 09XXXXXXXXX format for Semaphore */
export function normalizePhPhone(phone: string): string {
  // Remove all spaces, dashes, parentheses, and dots
  let normalized = phone.replace(/[\s\-().]/g, '')

  if (normalized.startsWith('+63')) {
    normalized = '0' + normalized.slice(3)
  } else if (normalized.startsWith('63') && normalized.length === 12) {
    normalized = '0' + normalized.slice(2)
  }
  // Already starts with 09 — keep as-is

  return normalized
}

/**
 * Builds an SMS message for a borrower reminder.
 * SMS messages must be ≤ 160 characters for a single segment.
 * Uses first name only to save characters.
 */
export function buildBorrowerReminderSMS(notification: PendingNotification): string {
  const { borrowerName, notificationType, daysUntilDue, dueDate, amountDue, penaltyAmount } =
    notification

  // First name only to save characters
  const firstName = borrowerName.split(' ')[0]
  const formattedAmount = formatPHP(amountDue)
  const daysOverdue = Math.abs(daysUntilDue)
  // Short date format for SMS: "Apr 25"
  const shortDate = formatManila(dueDate, 'MMM d')

  let message: string

  if (notificationType === 'reminder_3day' || notificationType === 'reminder_1day') {
    message = `MFK Lending: Hi ${firstName}, your payment of ${formattedAmount} is due on ${shortDate}. Pay to GoTyme 014721202843. Ignore if paid.`
  } else if (notificationType === 'reminder_due') {
    message = `MFK Lending: Hi ${firstName}, your payment of ${formattedAmount} is due TODAY. Pay to GoTyme 014721202843 ASAP.`
  } else {
    // overdue_1day, overdue_7day, overdue_weekly
    const formattedPenalty = formatPHP(penaltyAmount)
    const totalDue = formatPHP(amountDue + penaltyAmount)
    message = `MFK Lending: Hi ${firstName}, your payment of ${formattedAmount} is ${daysOverdue} day(s) overdue. Penalty: ${formattedPenalty}. Total due: ${totalDue}. Pay to GoTyme 014721202843.`
  }

  // Truncate to 160 characters if over limit
  if (message.length > 160) {
    message = message.slice(0, 157) + '...'
  }

  return message
}

export async function sendSMS(
  phone: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  if (!process.env.SEMAPHORE_API_KEY) {
    console.error('[sms] sendSMS: SEMAPHORE_API_KEY is not set')
    return { success: false, error: 'SMS service is not configured' }
  }

  const normalizedPhone = normalizePhPhone(phone)

  try {
    const response = await fetch(SEMAPHORE_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apikey: process.env.SEMAPHORE_API_KEY,
        number: normalizedPhone,
        message,
        sendername: SEMAPHORE_SENDER,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      // TODO: Replace with Sentry.captureException() once @sentry/nextjs is installed
      console.error('[sms] sendSMS failed:', response.status, errorText, { phone: normalizedPhone })
      return { success: false, error: `HTTP ${response.status}: ${errorText}` }
    }

    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error sending SMS'
    // TODO: Replace with Sentry.captureException() once @sentry/nextjs is installed
    console.error('[sms] sendSMS threw:', message, { phone: normalizedPhone })
    return { success: false, error: message }
  }
}
