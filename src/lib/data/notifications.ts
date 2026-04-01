import { createServiceRoleClient } from '@/lib/supabase/service-role'
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
  const now = new Date()
  const todayStart = new Date(now)
  todayStart.setHours(0, 0, 0, 0)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const [todayResult, monthResult, failedResult, activeResult] = await Promise.all([
    supabase
      .from('notification_logs')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'sent')
      .gte('created_at', todayStart.toISOString()),
    supabase
      .from('notification_logs')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'sent')
      .gte('created_at', monthStart.toISOString()),
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
