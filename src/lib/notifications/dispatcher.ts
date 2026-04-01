// TODO: Replace console.error with Sentry.captureException() once @sentry/nextjs is installed.
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import type { PartnerEscalation, PendingNotification } from '@/types'
import { buildBorrowerReminderEmail, buildPartnerEscalationEmail, sendEmail } from './email'
import { getLoansRequiringNotification, getPartnerEscalations } from './reminder-engine'
import { buildBorrowerReminderSMS, sendSMS } from './sms'

export interface ReminderPipelineResult {
  notificationsQueried: number
  emailsSent: number
  emailsFailed: number
  smsSent: number
  smsFailed: number
  escalationsSent: boolean
  durationMs: number
  errors: string[]
}

async function createNotificationLog(
  notification: PendingNotification,
  subject: string | null,
  body: string
): Promise<string | null> {
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from('notification_logs')
    .insert({
      loan_id: notification.loanId,
      schedule_id: notification.scheduleId,
      borrower_id: notification.borrowerId,
      channel: notification.channel,
      notification_type: notification.notificationType,
      recipient:
        notification.channel === 'email' ? notification.borrowerEmail : notification.borrowerPhone,
      subject,
      body,
      status: 'pending',
    })
    .select('id')
    .single()

  if (error) {
    console.error('[dispatcher] Failed to create notification log:', error.message)
    return null
  }

  return data.id
}

async function updateNotificationLog(
  logId: string,
  status: 'sent' | 'failed',
  error?: string
): Promise<void> {
  const supabase = createServiceRoleClient()
  await supabase
    .from('notification_logs')
    .update({
      status,
      error: error ?? null,
      sent_at: status === 'sent' ? new Date().toISOString() : null,
    })
    .eq('id', logId)
}

/** 100ms delay for Semaphore rate limiting */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function dispatchNotification(
  notification: PendingNotification
): Promise<{ success: boolean }> {
  let logId: string | null = null

  try {
    if (notification.channel === 'email') {
      const payload = buildBorrowerReminderEmail(notification)
      logId = await createNotificationLog(notification, payload.subject, payload.text)

      const result = await sendEmail(payload)

      if (logId) {
        await updateNotificationLog(logId, result.success ? 'sent' : 'failed', result.error)
      }

      return { success: result.success }
    } else {
      // SMS channel
      const message = buildBorrowerReminderSMS(notification)
      logId = await createNotificationLog(notification, null, message)

      const result = await sendSMS(notification.borrowerPhone, message)

      if (logId) {
        await updateNotificationLog(logId, result.success ? 'sent' : 'failed', result.error)
      }

      return { success: result.success }
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown dispatch error'
    // TODO: Replace with Sentry.captureException() once @sentry/nextjs is installed
    console.error('[dispatcher] dispatchNotification threw:', errorMsg)

    if (logId) {
      await updateNotificationLog(logId, 'failed', errorMsg)
    }

    return { success: false }
  }
}

export async function dispatchPartnerEscalation(
  escalations: PartnerEscalation[]
): Promise<boolean> {
  if (escalations.length === 0) return false

  try {
    const supabase = createServiceRoleClient()

    // Get partner emails
    const { data: partners, error: partnerError } = await supabase
      .from('partners')
      .select('id, email')

    if (partnerError || !partners || partners.length === 0) {
      console.error('[dispatcher] Failed to fetch partner emails:', partnerError?.message)
      return false
    }

    const partnerEmails = partners.map((p: { id: string; email: string }) => p.email)
    const payload = buildPartnerEscalationEmail(escalations, partnerEmails)

    // Get borrower_id for the first escalated loan (for the log entry)
    const { data: firstLoan, error: loanError } = await supabase
      .from('loans')
      .select('borrower_id')
      .eq('id', escalations[0].loanId)
      .single()

    if (loanError || !firstLoan?.borrower_id) {
      // TODO: Replace with Sentry.captureException() once @sentry/nextjs is installed
      console.error(
        '[dispatcher] Could not resolve borrower_id for escalation loan:',
        escalations[0].loanId,
        loanError?.message
      )
      return false
    }

    const borrowerId = firstLoan.borrower_id
    let anySent = false

    for (const partner of partners as Array<{ id: string; email: string }>) {
      const singlePayload = { ...payload, to: partner.email }

      const { data: logData } = await supabase
        .from('notification_logs')
        .insert({
          loan_id: escalations[0].loanId,
          schedule_id: null,
          borrower_id: borrowerId,
          channel: 'email' as const,
          notification_type: 'overdue_7day' as const,
          recipient: partner.email,
          subject: payload.subject,
          body: payload.text,
          status: 'pending',
        })
        .select('id')
        .single()

      const result = await sendEmail(singlePayload)

      if (logData?.id) {
        await updateNotificationLog(logData.id, result.success ? 'sent' : 'failed', result.error)
      }

      if (result.success) {
        anySent = true
      } else {
        console.error('[dispatcher] Failed to send escalation email to partner:', partner.email)
      }
    }

    return anySent
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown escalation error'
    // TODO: Replace with Sentry.captureException() once @sentry/nextjs is installed
    console.error('[dispatcher] dispatchPartnerEscalation threw:', errorMsg)
    return false
  }
}

export async function runReminderPipeline(): Promise<ReminderPipelineResult> {
  const startTime = Date.now()
  const errors: string[] = []
  let emailsSent = 0
  let emailsFailed = 0
  let smsSent = 0
  let smsFailed = 0
  let escalationsSent = false

  // Query who needs notifications today
  const [notifications, escalations] = await Promise.all([
    getLoansRequiringNotification().catch((err) => {
      const msg = err instanceof Error ? err.message : 'Query error'
      errors.push(`getLoansRequiringNotification: ${msg}`)
      return [] as PendingNotification[]
    }),
    getPartnerEscalations().catch((err) => {
      const msg = err instanceof Error ? err.message : 'Query error'
      errors.push(`getPartnerEscalations: ${msg}`)
      return [] as PartnerEscalation[]
    }),
  ])

  // Process notifications SEQUENTIALLY with 100ms delay between SMS sends
  // Semaphore free tier rate limit requires this
  for (const notification of notifications) {
    const result = await dispatchNotification(notification)

    if (notification.channel === 'email') {
      if (result.success) emailsSent++
      else emailsFailed++
    } else {
      if (result.success) smsSent++
      else smsFailed++
      // 100ms delay between SMS sends (Semaphore rate limit)
      await delay(100)
    }
  }

  // Dispatch partner escalations if any
  if (escalations.length > 0) {
    escalationsSent = await dispatchPartnerEscalation(escalations).catch((err) => {
      const msg = err instanceof Error ? err.message : 'Escalation error'
      errors.push(`dispatchPartnerEscalation: ${msg}`)
      return false
    })
  }

  return {
    notificationsQueried: notifications.length,
    emailsSent,
    emailsFailed,
    smsSent,
    smsFailed,
    escalationsSent,
    durationMs: Date.now() - startTime,
    errors,
  }
}
