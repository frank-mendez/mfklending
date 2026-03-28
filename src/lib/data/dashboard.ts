import { subMonths } from 'date-fns'
import { format, toZonedTime } from 'date-fns-tz'
import { createClient } from '@/lib/supabase/client'
import type { FundSummary, LoanWithBorrower } from '@/types'

const MANILA_TZ = 'Asia/Manila'

export async function getFundSummary(): Promise<FundSummary | null> {
  const supabase = createClient()
  const { data, error } = await supabase.from('fund_summary').select('*').limit(1).single()

  if (error) {
    console.error('getFundSummary error:', error)
    return null
  }

  return data as FundSummary
}

export async function getActiveLoans(limit = 5): Promise<LoanWithBorrower[]> {
  const supabase = createClient()
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

export interface StashThisMonthEntry {
  partner_name: string
  amount: number
  remarks: string | null
}

export async function getStashThisMonth(): Promise<StashThisMonthEntry[]> {
  const supabase = createClient()
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

export interface CashFlowEntry {
  month: string
  interest: number
  principal: number
}

export async function getCashFlowByMonth(months: number): Promise<CashFlowEntry[]> {
  const supabase = createClient()

  // Build the date range: from the start of (months) ago to now
  const now = toZonedTime(new Date(), MANILA_TZ)
  const startDate = subMonths(now, months - 1)
  startDate.setDate(1)
  startDate.setHours(0, 0, 0, 0)

  const { data, error } = await supabase
    .from('payments')
    .select('amount_paid, paid_at, payment_type')
    .gte('paid_at', startDate.toISOString())
    .order('paid_at', { ascending: true })

  if (error) {
    console.error('getCashFlowByMonth error:', error)
    return []
  }

  // Build month labels for the last N months
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

    if (payment.payment_type === 'interest') {
      entry.interest += payment.amount_paid
    } else if (payment.payment_type === 'principal' || payment.payment_type === 'full') {
      entry.principal += payment.amount_paid
    }
  }

  return Array.from(monthMap.values())
}
