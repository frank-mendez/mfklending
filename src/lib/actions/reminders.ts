'use server'

import { type ActionState, actionError, actionSuccess } from '@/lib/actions'
import { withSentry } from '@/lib/actions/with-sentry'

async function _triggerRemindersManually(): Promise<ActionState> {
  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return actionError('You must be signed in to trigger reminders.')
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    return actionError('CRON_SECRET is not configured.')
  }

  const response = await fetch(`${appUrl}/api/reminders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${cronSecret}`,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const text = await response.text()
    return actionError(`Reminder pipeline failed: ${response.status} ${text}`)
  }

  const result = (await response.json()) as {
    result?: { emailsSent?: number; smsSent?: number }
  }

  return actionSuccess(
    `Reminders sent: ${result.result?.emailsSent ?? 0} email(s), ${result.result?.smsSent ?? 0} SMS`,
    result.result
  )
}

export const triggerRemindersManually = withSentry(
  'triggerRemindersManually',
  _triggerRemindersManually
)
