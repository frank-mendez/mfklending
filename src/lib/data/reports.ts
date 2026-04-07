import { createClient } from '@/lib/supabase/client'
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
  return queryFundHealth(createClient())
}

export async function getInterestEarned(params: InterestEarnedParams) {
  return queryInterestEarned(createClient(), params)
}

export async function getLoanBook(filters: LoanBookFilters) {
  return queryLoanBook(createClient(), filters)
}

export async function getPartnerEquity() {
  return queryPartnerEquity(createClient())
}

export async function getDividendHistory() {
  return queryDividendHistory(createClient())
}

export async function getAvailableYears() {
  return queryAvailableYears(createClient())
}
