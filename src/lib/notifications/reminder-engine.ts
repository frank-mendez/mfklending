import { addDays, differenceInCalendarDays, format, parseISO, subDays } from 'date-fns'
import { calcLatePenalty } from '@/lib/finance'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { todayManila } from '@/lib/utils/date'
import type {
  NotificationChannel,
  NotificationTypeEnum,
  PartnerEscalation,
  PendingNotification,
} from '@/types'

export async function getLoansRequiringNotification(): Promise<PendingNotification[]> {
  const supabase = createServiceRoleClient()
  const today = todayManila()

  // Date strings for timing windows
  const day3 = format(addDays(parseISO(today), 3), 'yyyy-MM-dd')
  const day1 = format(addDays(parseISO(today), 1), 'yyyy-MM-dd')
  const overdueDay1 = format(subDays(parseISO(today), 1), 'yyyy-MM-dd')
  const overdueDay7 = format(subDays(parseISO(today), 7), 'yyyy-MM-dd')

  // 1. Fetch active/overdue loans with reminders enabled, their schedules and borrowers
  //    Filter reminders_enabled and status DIRECTLY on loans table (not nested dot-notation)
  const { data: loans, error } = await supabase
    .from('loans')
    .select(
      `
      id, loan_type, principal, interest_rate, status, reminders_enabled,
      borrowers!inner ( id, full_name, email, phone ),
      loan_schedules (
        id, loan_id, due_date, period_number, interest_due, total_due, balance_after, status
      )
    `
    )
    .eq('reminders_enabled', true)
    .in('status', ['active', 'overdue'])

  if (error) throw new Error(`Failed to fetch loans: ${error.message}`)
  if (!loans || loans.length === 0) return []

  // 2. Fetch today's already-sent notifications for deduplication (Manila day)
  const { data: sentToday, error: sentTodayError } = await supabase
    .from('notification_logs')
    .select('loan_id, schedule_id, notification_type, channel')
    .eq('status', 'sent')
    .gte('sent_at', `${today}T00:00:00+08:00`)
    .lte('sent_at', `${today}T23:59:59+08:00`)

  if (sentTodayError)
    throw new Error(`Failed to fetch sent notifications: ${sentTodayError.message}`)

  const sentSet = new Set(
    (sentToday ?? []).map(
      (s) => `${s.loan_id}:${s.schedule_id}:${s.notification_type}:${s.channel}`
    )
  )

  // 3. For hybrid_diminishing loans, get principal returns to compute outstanding balance
  const hybridLoanIds = loans
    .filter((l: any) => l.loan_type === 'hybrid_diminishing')
    .map((l: any) => l.id)

  const principalReturnsMap: Record<string, number> = {}
  if (hybridLoanIds.length > 0) {
    const { data: returns, error: returnsError } = await supabase
      .from('principal_returns')
      .select('loan_id, amount')
      .in('loan_id', hybridLoanIds)

    if (returnsError) throw new Error(`Failed to fetch principal returns: ${returnsError.message}`)

    for (const r of returns ?? []) {
      principalReturnsMap[r.loan_id] = (principalReturnsMap[r.loan_id] ?? 0) + r.amount
    }
  }

  const results: PendingNotification[] = []

  for (const loan of loans as any[]) {
    const borrower = loan.borrowers
    const schedules = (loan.loan_schedules as any[]) ?? []

    // Only process schedules with pending or late status
    const activeSchedules = schedules.filter((s) => s.status === 'pending' || s.status === 'late')

    for (const schedule of activeSchedules) {
      // Determine notification type based on due_date vs today
      let notificationType: NotificationTypeEnum | null = null
      let daysUntilDue: number = 0

      if (schedule.due_date === day3) {
        notificationType = 'reminder_3day'
        daysUntilDue = 3
      } else if (schedule.due_date === day1) {
        notificationType = 'reminder_1day'
        daysUntilDue = 1
      } else if (schedule.due_date === today) {
        notificationType = 'reminder_due'
        daysUntilDue = 0
      } else if (schedule.due_date === overdueDay1) {
        notificationType = 'overdue_1day'
        daysUntilDue = -1
      } else if (schedule.due_date === overdueDay7) {
        notificationType = 'overdue_7day'
        daysUntilDue = -7
      } else {
        // Check overdue_weekly: due_date < overdueDay7 AND days overdue % 7 === 0
        const daysOver = differenceInCalendarDays(parseISO(today), parseISO(schedule.due_date))
        if (daysOver > 7 && daysOver % 7 === 0) {
          notificationType = 'overdue_weekly'
          daysUntilDue = -daysOver
        }
      }

      if (!notificationType) continue

      // Compute outstanding balance
      let outstandingBalance: number
      if (loan.loan_type === 'hybrid_diminishing') {
        const totalReturned = principalReturnsMap[loan.id] ?? 0
        outstandingBalance = loan.principal - totalReturned
      } else if (loan.loan_type === 'flat_interest') {
        // Flat-interest loans: borrower pays interest only — full principal is always outstanding
        outstandingBalance = loan.principal
      } else {
        // Diminishing: balance tracked per schedule row
        outstandingBalance = schedule.balance_after
      }

      // Compute penalty for overdue entries
      const penaltyAmount =
        daysUntilDue < 0
          ? calcLatePenalty({
              daysLate: Math.abs(daysUntilDue),
              monthlyInterest: schedule.interest_due,
            })
          : 0

      // Emit one PendingNotification per channel (email + sms)
      for (const channel of ['email', 'sms'] as NotificationChannel[]) {
        const dedupKey = `${loan.id}:${schedule.id}:${notificationType}:${channel}`
        if (sentSet.has(dedupKey)) continue // already sent today

        results.push({
          loanId: loan.id,
          scheduleId: schedule.id,
          borrowerId: borrower.id,
          borrowerName: borrower.full_name,
          borrowerEmail: borrower.email,
          borrowerPhone: borrower.phone,
          channel,
          notificationType,
          daysUntilDue,
          dueDate: schedule.due_date,
          amountDue: schedule.total_due,
          penaltyAmount,
          outstandingBalance,
        })
      }
    }
  }

  return results
}

export async function getPartnerEscalations(): Promise<PartnerEscalation[]> {
  const supabase = createServiceRoleClient()
  const today = todayManila()
  const threshold = format(subDays(parseISO(today), 7), 'yyyy-MM-dd')

  // Fetch active/overdue loans with reminders enabled
  // Filter directly on loans table columns (not dot-notation on nested relations)
  const { data: loans, error } = await supabase
    .from('loans')
    .select(
      `
      id, reminders_enabled, status,
      borrowers!inner ( full_name ),
      loan_schedules (
        id, loan_id, due_date, period_number, interest_due, total_due, status
      )
    `
    )
    .eq('reminders_enabled', true)
    .in('status', ['active', 'overdue'])

  if (error) throw new Error(`Failed to fetch escalation loans: ${error.message}`)
  if (!loans || loans.length === 0) return []

  const loanMap = new Map<string, PartnerEscalation>()

  for (const loan of loans as any[]) {
    const borrower = loan.borrowers
    const schedules = (loan.loan_schedules as any[]) ?? []

    // Only schedules that are >= 7 days overdue with pending/late status
    const overdueSchedules = schedules.filter(
      (s) => (s.status === 'pending' || s.status === 'late') && s.due_date <= threshold
    )

    if (overdueSchedules.length === 0) continue

    for (const schedule of overdueSchedules) {
      const daysLate = differenceInCalendarDays(parseISO(today), parseISO(schedule.due_date))
      const penalty = calcLatePenalty({ daysLate, monthlyInterest: schedule.interest_due })

      if (!loanMap.has(loan.id)) {
        loanMap.set(loan.id, {
          loanId: loan.id,
          borrowerName: borrower.full_name,
          daysOverdue: daysLate,
          totalOverdueAmount: 0,
          penaltyAccrued: 0,
          scheduleEntries: [],
        })
      }

      const entry = loanMap.get(loan.id)!
      entry.totalOverdueAmount += schedule.total_due
      entry.penaltyAccrued += penalty
      if (daysLate > entry.daysOverdue) entry.daysOverdue = daysLate
      entry.scheduleEntries.push({
        period: schedule.period_number,
        dueDate: schedule.due_date,
        amountDue: schedule.total_due,
        daysLate,
        penalty,
      })
    }
  }

  return Array.from(loanMap.values())
}
