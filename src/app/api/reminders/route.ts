// TODO: Replace console.error with Sentry.captureException() once @sentry/nextjs is installed.
import { type NextRequest, NextResponse } from 'next/server'
import { runReminderPipeline } from '@/lib/notifications/dispatcher'

async function handleCronRequest(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await runReminderPipeline()

    console.info('[reminders] Pipeline complete:', result)

    return NextResponse.json({ success: true, result }, { status: 200 })
  } catch (error) {
    // TODO: Replace with Sentry.captureException() once @sentry/nextjs is installed
    console.error('[reminders] Pipeline failed:', error)
    return NextResponse.json({ success: false, error: 'Pipeline failed' }, { status: 500 })
  }
}

// Vercel Cron sends GET requests by default
export async function GET(request: NextRequest) {
  return handleCronRequest(request)
}

// POST is kept for manual triggers (e.g. curl, Run Now button)
export async function POST(request: NextRequest) {
  return handleCronRequest(request)
}
