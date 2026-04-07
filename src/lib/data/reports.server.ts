import { createClient } from '@/lib/supabase/server'
import type { InterestEarnedParams, LoanBookFilters } from '@/types'
import {
  queryAvailableYears,
  queryDividendHistory,
  queryFundHealth,
  queryInterestEarned,
  queryLoanBook,
  queryPartnerEquity,
} from './reports-query'

export async function getFundHealth() {
  return queryFundHealth(await createClient())
}

export async function getInterestEarned(params: InterestEarnedParams) {
  return queryInterestEarned(await createClient(), params)
}

export async function getLoanBook(filters: LoanBookFilters) {
  return queryLoanBook(await createClient(), filters)
}

export async function getPartnerEquity() {
  return queryPartnerEquity(await createClient())
}

export async function getDividendHistory() {
  return queryDividendHistory(await createClient())
}

export async function getAvailableYears() {
  return queryAvailableYears(await createClient())
}
