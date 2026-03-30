import { createClient } from '@/lib/supabase/server'
import {
  queryActiveLoans,
  queryCashFlowByMonth,
  queryFundSummary,
  queryStashThisMonth,
} from './dashboard-query'

export type { CashFlowEntry, StashThisMonthEntry } from './dashboard-query'

export async function getFundSummary() {
  return queryFundSummary(await createClient())
}

export async function getActiveLoans(limit = 5) {
  return queryActiveLoans(await createClient(), limit)
}

export async function getStashThisMonth() {
  return queryStashThisMonth(await createClient())
}

export async function getCashFlowByMonth(months: number) {
  return queryCashFlowByMonth(await createClient(), months)
}
