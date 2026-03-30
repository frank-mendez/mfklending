import { createClient } from '@/lib/supabase/client'
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
  return queryContributions(createClient())
}

export async function getDividends() {
  return queryDividends(createClient())
}

export async function getStashSummary() {
  return queryStashSummary(createClient())
}

export async function getPartners() {
  return queryPartners(createClient())
}
