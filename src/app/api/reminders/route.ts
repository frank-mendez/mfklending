// TODO: Replace console.error with Sentry.captureException() once @sentry/nextjs is installed.
import { type NextRequest, NextResponse } from 'next/server'
import { runReminderPipeline } from '@/lib/notifications/dispatcher'

export async function POST(request: NextRequest) {
  // Validate CRON_SECRET
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

// Block GET requests — cron triggers via POST only
export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}
