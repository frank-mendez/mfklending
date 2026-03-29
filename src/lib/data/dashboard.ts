import { createClient } from '@/lib/supabase/client'
import {
  queryActiveLoans,
  queryCashFlowByMonth,
  queryFundSummary,
  queryStashThisMonth,
} from './dashboard-query'

export type { CashFlowEntry, StashThisMonthEntry } from './dashboard-query'

export async function getFundSummary() {
  return queryFundSummary(createClient())
}

export async function getActiveLoans(limit = 5) {
  return queryActiveLoans(createClient(), limit)
}

export async function getStashThisMonth() {
  return queryStashThisMonth(createClient())
}

export async function getCashFlowByMonth(months: number) {
  return queryCashFlowByMonth(createClient(), months)
}
