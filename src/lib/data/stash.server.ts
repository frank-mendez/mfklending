import { createClient } from '@/lib/supabase/server'
import { queryContributions, queryDividends, queryPartners, queryStashSummary } from './stash-query'

export type {
  ContributionEntry,
  ContributionsByMonth,
  DividendEntry,
  DividendsByDate,
  PartnerStashTotal,
  StashSummary,
} from './stash-query'

export async function getContributions() {
  return queryContributions(await createClient())
}

export async function getDividends() {
  return queryDividends(await createClient())
}

export async function getStashSummary() {
  return queryStashSummary(await createClient())
}

export async function getPartners() {
  return queryPartners(await createClient())
}
