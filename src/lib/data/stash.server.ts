import { createClient } from '@/lib/supabase/server'
import type { Partner } from '@/types'
import type {
  ContributionsByMonth,
  DividendsByDate,
  PartnerStashTotal,
  StashSummary,
} from './stash'

export type { ContributionsByMonth, DividendsByDate, StashSummary } from './stash'

export async function getContributions(): Promise<ContributionsByMonth[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('contributions')
    .select('month, amount, remarks, partner:partners(name)')
    .order('month', { ascending: false })

  if (error) {
    console.error('getContributions error:', error)
    return []
  }

  const monthMap = new Map<string, ContributionsByMonth['contributions']>()
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

export async function getDividends(): Promise<DividendsByDate[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('dividends')
    .select('*, partner:partners(name)')
    .order('distributed_at', { ascending: false })

  if (error) {
    console.error('getDividends error:', error)
    return []
  }

  const dateMap = new Map<string, DividendsByDate['dividends']>()
  for (const row of data ?? []) {
    const partnerName = (row.partner as unknown as { name: string } | null)?.name ?? ''
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { partner: _partner, ...dividend } = row
    const entry = { ...dividend, partner_name: partnerName }
    const existing = dateMap.get(row.distributed_at) ?? []
    existing.push(entry as DividendsByDate['dividends'][number])
    dateMap.set(row.distributed_at, existing)
  }

  return Array.from(dateMap.entries()).map(([distributed_at, dividends]) => ({
    distributed_at,
    dividends,
  }))
}

export async function getStashSummary(): Promise<StashSummary> {
  const supabase = await createClient()
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

export async function getPartners(): Promise<Partner[]> {
  const supabase = await createClient()
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
