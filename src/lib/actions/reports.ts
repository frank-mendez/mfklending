'use server'

import {
  buildDividendHistoryCSV,
  buildInterestEarnedCSV,
  buildLoanBookCSV,
  buildPartnerEquityCSV,
} from '@/lib/data/reports-csv'
import type { InterestEarnedParams, LoanBookFilters } from '@/types'

export async function exportInterestEarnedCSV(params: InterestEarnedParams): Promise<string> {
  return buildInterestEarnedCSV(params)
}

export async function exportLoanBookCSV(filters: LoanBookFilters): Promise<string> {
  return buildLoanBookCSV(filters)
}

export async function exportPartnerEquityCSV(): Promise<string> {
  return buildPartnerEquityCSV()
}

export async function exportDividendHistoryCSV(): Promise<string> {
  return buildDividendHistoryCSV()
}
