import type { SupabaseClient } from '@supabase/supabase-js'
import { subMonths } from 'date-fns'
import { format, toZonedTime } from 'date-fns-tz'
import type { FundSummary, LoanWithBorrower } from '@/types'

const MANILA_TZ = 'Asia/Manila'

export interface StashThisMonthEntry {
  partner_name: string
  amount: number
  remarks: string | null
}

export interface CashFlowEntry {
  month: string
  interest: number
  principal: number
}

export async function queryFundSummary(supabase: SupabaseClient): Promise<FundSummary | null> {
  const { data, error } = await supabase.from('fund_summary').select('*').limit(1).single()

  if (error) {
    console.error('getFundSummary error:', error)
    return null
  }

  return data as FundSummary
}

export async function queryActiveLoans(
  supabase: SupabaseClient,
  limit = 5
): Promise<LoanWithBorrower[]> {
  const { data, error } = await supabase
    .from('loans')
    .select('*, borrower:borrowers(*)')
    .in('status', ['active', 'overdue'])
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('getActiveLoans error:', error)
    return []
  }

  return (data ?? []) as unknown as LoanWithBorrower[]
}

export async function queryStashThisMonth(
  supabase: SupabaseClient
): Promise<StashThisMonthEntry[]> {
  const currentMonth = format(toZonedTime(new Date(), MANILA_TZ), 'yyyy-MM', {
    timeZone: MANILA_TZ,
  })

  const { data, error } = await supabase
    .from('contributions')
    .select('amount, remarks, partner:partners(name)')
    .eq('month', currentMonth)

  if (error) {
    console.error('getStashThisMonth error:', error)
    return []
  }

  return (data ?? []).map((row) => ({
    partner_name: (row.partner as unknown as { name: string } | null)?.name ?? '',
    amount: row.amount,
    remarks: row.remarks,
  }))
}

export async function queryCashFlowByMonth(
  supabase: SupabaseClient,
  months: number
): Promise<CashFlowEntry[]> {
  const now = toZonedTime(new Date(), MANILA_TZ)
  const startDate = subMonths(now, months - 1)
  startDate.setDate(1)
  startDate.setHours(0, 0, 0, 0)

  const { data, error } = await supabase
    .from('payments')
    .select(
      'amount_paid, paid_at, payment_type, penalty_amount, schedule:loan_schedules(interest_due, principal_due)'
    )
    .gte('paid_at', startDate.toISOString())
    .order('paid_at', { ascending: true })

  if (error) {
    console.error('getCashFlowByMonth error:', error)
    return []
  }

  const monthMap = new Map<string, CashFlowEntry>()
  for (let i = months - 1; i >= 0; i--) {
    const d = toZonedTime(subMonths(new Date(), i), MANILA_TZ)
    const label = format(d, 'MMM yyyy', { timeZone: MANILA_TZ })
    monthMap.set(label, { month: label, interest: 0, principal: 0 })
  }

  for (const payment of data ?? []) {
    const manilaDate = toZonedTime(new Date(payment.paid_at), MANILA_TZ)
    const label = format(manilaDate, 'MMM yyyy', { timeZone: MANILA_TZ })
    const entry = monthMap.get(label)
    if (!entry) continue

    const scheduleRaw = payment.schedule as unknown
    const schedule = Array.isArray(scheduleRaw)
      ? ((scheduleRaw[0] as { interest_due: number; principal_due: number } | undefined) ?? null)
      : (scheduleRaw as { interest_due: number; principal_due: number } | null)
    const penalty = payment.penalty_amount ?? 0

    if (payment.payment_type === 'interest') {
      entry.interest += Math.max(0, payment.amount_paid - penalty)
    } else if (payment.payment_type === 'principal') {
      entry.principal += Math.max(0, payment.amount_paid - penalty)
    } else if (payment.payment_type === 'full') {
      if (schedule) {
        entry.interest += schedule.interest_due
        entry.principal += schedule.principal_due
      } else {
        entry.principal += Math.max(0, payment.amount_paid - penalty)
      }
    }
  }

  return Array.from(monthMap.values())
}
