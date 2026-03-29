import type { SupabaseClient } from '@supabase/supabase-js'
import type { Dividend, Partner } from '@/types'

export interface ContributionEntry {
  partner_name: string
  amount: number
  remarks: string | null
}

export interface ContributionsByMonth {
  month: string // YYYY-MM
  contributions: ContributionEntry[]
}

export interface DividendEntry extends Dividend {
  partner_name: string
}

export interface DividendsByDate {
  distributed_at: string
  dividends: DividendEntry[]
}

export interface PartnerStashTotal {
  partner_id: string
  partner_name: string
  total: number
}

export interface StashSummary {
  partners: PartnerStashTotal[]
  grandTotal: number
}

export async function queryContributions(
  supabase: SupabaseClient
): Promise<ContributionsByMonth[]> {
  const { data, error } = await supabase
    .from('contributions')
    .select('month, amount, remarks, partner:partners(name)')
    .order('month', { ascending: false })

  if (error) {
    console.error('getContributions error:', error)
    return []
  }

  const monthMap = new Map<string, ContributionEntry[]>()
  for (const row of data ?? []) {
    const existing = monthMap.get(row.month) ?? []
    existing.push({
      partner_name: (row.partner as unknown as { name: string } | null)?.name ?? '',
      amount: row.amount,
      remarks: row.remarks,
    })
    monthMap.set(row.month, existing)
  }

  return Array.from(monthMap.entries()).map(([month, contributions]) => ({
    month,
    contributions,
  }))
}

export async function queryDividends(supabase: SupabaseClient): Promise<DividendsByDate[]> {
  const { data, error } = await supabase
    .from('dividends')
    .select('*, partner:partners(name)')
    .order('distributed_at', { ascending: false })

  if (error) {
    console.error('getDividends error:', error)
    return []
  }

  const dateMap = new Map<string, DividendEntry[]>()
  for (const row of data ?? []) {
    const partnerName = (row.partner as unknown as { name: string } | null)?.name ?? ''
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { partner: _partner, ...dividend } = row
    const entry: DividendEntry = { ...(dividend as Dividend), partner_name: partnerName }
    const existing = dateMap.get(row.distributed_at) ?? []
    existing.push(entry)
    dateMap.set(row.distributed_at, existing)
  }

  return Array.from(dateMap.entries()).map(([distributed_at, dividends]) => ({
    distributed_at,
    dividends,
  }))
}

export async function queryStashSummary(supabase: SupabaseClient): Promise<StashSummary> {
  const { data, error } = await supabase
    .from('contributions')
    .select('partner_id, amount, partner:partners(name)')

  if (error) {
    console.error('getStashSummary error:', error)
    return { partners: [], grandTotal: 0 }
  }

  const partnerMap = new Map<string, { name: string; total: number }>()
  let grandTotal = 0

  for (const row of data ?? []) {
    const partnerName = (row.partner as unknown as { name: string } | null)?.name ?? ''
    const existing = partnerMap.get(row.partner_id) ?? { name: partnerName, total: 0 }
    existing.total += row.amount
    partnerMap.set(row.partner_id, existing)
    grandTotal += row.amount
  }

  const partners: PartnerStashTotal[] = Array.from(partnerMap.entries()).map(
    ([partner_id, { name, total }]) => ({
      partner_id,
      partner_name: name,
      total,
    })
  )

  return { partners, grandTotal }
}

export async function queryPartners(supabase: SupabaseClient): Promise<Partner[]> {
  const { data, error } = await supabase
    .from('partners')
    .select('*')
    .order('name', { ascending: true })

  if (error) {
    console.error('getPartners error:', error)
    return []
  }

  return (data ?? []) as Partner[]
}
