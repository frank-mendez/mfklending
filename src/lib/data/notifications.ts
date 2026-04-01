import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { todayManila } from '@/lib/utils/date'
import type { NotificationLog } from '@/types'

export interface NotificationLogWithBorrower extends NotificationLog {
  borrower_name: string | null
}

export async function getNotificationLogs(limit = 50): Promise<NotificationLogWithBorrower[]> {
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from('notification_logs')
    .select(`
      *,
      borrowers ( full_name )
    `)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(`Failed to fetch notification logs: ${error.message}`)

  return (data ?? []).map((row: Record<string, unknown>) => {
    const borrowersRel = row.borrowers as { full_name: string } | null
    const { borrowers: _borrowers, ...rest } = row
    void _borrowers
    return {
      ...(rest as unknown as NotificationLog),
      borrower_name: borrowersRel?.full_name ?? null,
    }
  })
}

export async function getNotificationStats() {
  const supabase = createServiceRoleClient()
  // Use Manila calendar day for "today" and "this month" boundaries
  const today = todayManila() // 'yyyy-MM-dd' in Asia/Manila
  const todayStart = `${today}T00:00:00+08:00`
  const monthStart = `${today.slice(0, 7)}-01T00:00:00+08:00`

  const [todayResult, monthResult, failedResult, activeResult] = await Promise.all([
    supabase
      .from('notification_logs')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'sent')
      .gte('sent_at', todayStart),
    supabase
      .from('notification_logs')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'sent')
      .gte('sent_at', monthStart),
    supabase
      .from('notification_logs')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'failed'),
    supabase
      .from('loans')
      .select('id', { count: 'exact', head: true })
      .eq('reminders_enabled', true)
      .in('status', ['active', 'overdue']),
  ])

  return {
    sentToday: todayResult.count ?? 0,
    sentThisMonth: monthResult.count ?? 0,
    failedTotal: failedResult.count ?? 0,
    activeReminders: activeResult.count ?? 0,
  }
}
