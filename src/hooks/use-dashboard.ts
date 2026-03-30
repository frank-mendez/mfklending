'use client'

import { useQuery } from '@tanstack/react-query'
import {
  getActiveLoans,
  getCashFlowByMonth,
  getFundSummary,
  getStashThisMonth,
} from '@/lib/data/dashboard'
import { queryKeys } from '@/lib/query-keys'
import type { FundSummary, LoanWithBorrower } from '@/types'

export function useFundSummary(options?: { initialData?: FundSummary }) {
  return useQuery({
    queryKey: queryKeys.dashboard.summary(),
    queryFn: getFundSummary,
    initialData: options?.initialData,
  })
}

export function useActiveLoans(limit = 5, options?: { initialData?: LoanWithBorrower[] }) {
  return useQuery({
    queryKey: [...queryKeys.dashboard.all, 'active-loans', limit] as const,
    queryFn: () => getActiveLoans(limit),
    initialData: options?.initialData,
  })
}

export function useCashFlow(months: number) {
  return useQuery({
    queryKey: queryKeys.dashboard.cashflow(months),
    queryFn: () => getCashFlowByMonth(months),
  })
}

export function useStashThisMonth() {
  return useQuery({
    queryKey: [...queryKeys.dashboard.all, 'stash-this-month'] as const,
    queryFn: getStashThisMonth,
  })
}
