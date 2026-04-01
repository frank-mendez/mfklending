// TODO: Replace console.error with Sentry.captureException() once @sentry/nextjs is installed.
import { Resend } from 'resend'
import { formatPHP } from '@/lib/utils/currency'
import { formatManila } from '@/lib/utils/date'
import type { PartnerEscalation, PendingNotification } from '@/types'

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? 'reminders@mfklending.com'

export interface EmailPayload {
  to: string
  subject: string
  text: string
  html: string
}

const MFK_PAYMENT_DETAILS = `Bank: GoTyme Bank
Account Name: MFK Lending Corp
Account Number: 014721202843`

function toHtml(text: string): string {
  return `<pre style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6;">${text}</pre>`
}

export function buildBorrowerReminderEmail(notification: PendingNotification): EmailPayload {
  const {
    borrowerName,
    borrowerEmail,
    notificationType,
    daysUntilDue,
    dueDate,
    amountDue,
    penaltyAmount,
    outstandingBalance,
  } = notification

  const formattedDate = formatManila(dueDate, 'MMMM d, yyyy')
  const formattedAmount = formatPHP(amountDue)
  const formattedBalance = formatPHP(outstandingBalance)
  const formattedPenalty = formatPHP(penaltyAmount)
  const daysOverdue = Math.abs(daysUntilDue)

  let subject: string
  let body: string

  if (notificationType === 'reminder_3day' || notificationType === 'reminder_1day') {
    const daysText = daysUntilDue === 1 ? '1 day' : `${daysUntilDue} days`
    subject = `Payment Reminder — ${formattedAmount} due on ${formattedDate} | MFK Lending`
    body = `Hi ${borrowerName},

This is a friendly reminder that your loan payment of ${formattedAmount} is due on ${formattedDate} (${daysText} from now).

Payment details:
- Amount due: ${formattedAmount}
- Due date: ${formattedDate}
- Loan balance: ${formattedBalance}

Please send payment to:
${MFK_PAYMENT_DETAILS}

Reply to this email or contact us if you have any questions.

— MFK Lending Corp`
  } else if (notificationType === 'reminder_due') {
    subject = `Payment Due Today — ${formattedAmount} | MFK Lending`
    body = `Hi ${borrowerName},

Your loan payment of ${formattedAmount} is due TODAY, ${formattedDate}.

Payment details:
- Amount due: ${formattedAmount}
- Due date: ${formattedDate}
- Loan balance: ${formattedBalance}

Please send payment to:
${MFK_PAYMENT_DETAILS}

Reply to this email or contact us if you have any questions.

— MFK Lending Corp`
  } else if (notificationType === 'overdue_1day') {
    const penaltyPerDay = formatPHP(Math.round(amountDue * 0.01))
    const totalNowDue = formatPHP(amountDue + penaltyAmount)
    subject = `Payment Overdue — ${formattedAmount} + ${formattedPenalty} penalty | MFK Lending`
    body = `Hi ${borrowerName},

Your payment of ${formattedAmount} was due on ${formattedDate} and is now 1 day overdue.

A late penalty of ${penaltyPerDay}/day is now being charged on the overdue interest amount.

Amount overdue: ${formattedAmount}
Penalty accrued: ${formattedPenalty} (${daysOverdue} day(s) × 1% × ${formattedAmount})
Total now due: ${totalNowDue}

Please settle immediately to avoid further penalties.

Payment details:
${MFK_PAYMENT_DETAILS}

— MFK Lending Corp`
  } else {
    // overdue_7day or overdue_weekly
    const totalNowDue = formatPHP(amountDue + penaltyAmount)
    subject = `URGENT: Payment ${daysOverdue} Days Overdue — ${totalNowDue} | MFK Lending`
    body = `Hi ${borrowerName},

URGENT: Your payment of ${formattedAmount} was due on ${formattedDate} and is now ${daysOverdue} days overdue.

Amount overdue: ${formattedAmount}
Penalty accrued: ${formattedPenalty} (${daysOverdue} days × 1%/day)
Total now due: ${totalNowDue}

Please settle this immediately to stop further penalties from accumulating.

Payment details:
${MFK_PAYMENT_DETAILS}

— MFK Lending Corp`
  }

  return {
    to: borrowerEmail,
    subject,
    text: body,
    html: toHtml(body),
  }
}

export function buildPartnerEscalationEmail(
  escalations: PartnerEscalation[],
  partnerEmails: string[]
): EmailPayload {
  const count = escalations.length
  const subject = `⚠️ Overdue Loan Alert — ${count} loan(s) require attention | MFK`

  const escalationDetails = escalations
    .map((e) => {
      return `Borrower: ${e.borrowerName}
Days overdue: ${e.daysOverdue}
Total overdue: ${formatPHP(e.totalOverdueAmount)}
Penalty accrued: ${formatPHP(e.penaltyAccrued)}`
    })
    .join('\n\n---\n\n')

  const body = `Hi partners,

The following loans are overdue and require your attention:

${escalationDetails}

---

Please follow up with these borrowers directly.

— MFK Lending Automated System`

  return {
    to: partnerEmails.join(', '),
    subject,
    text: body,
    html: toHtml(body),
  }
}

export async function sendEmail(
  payload: EmailPayload
): Promise<{ success: boolean; error?: string }> {
  if (!process.env.RESEND_API_KEY) {
    console.error('[email] sendEmail: RESEND_API_KEY is not set')
    return { success: false, error: 'Email service is not configured' }
  }
  const resend = new Resend(process.env.RESEND_API_KEY)
  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: payload.to,
      subject: payload.subject,
      text: payload.text,
      html: payload.html,
    })

    if (error) {
      // TODO: Replace with Sentry.captureException() once @sentry/nextjs is installed
      console.error('[email] sendEmail failed:', error.message, {
        subject: payload.subject,
        to: payload.to,
      })
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error sending email'
    // TODO: Replace with Sentry.captureException() once @sentry/nextjs is installed
    console.error('[email] sendEmail threw:', message, {
      subject: payload.subject,
      to: payload.to,
    })
    return { success: false, error: message }
  }
}
