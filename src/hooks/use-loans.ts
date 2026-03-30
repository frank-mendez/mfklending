'use client'

import { useQuery } from '@tanstack/react-query'
import { getLoanById, getLoans } from '@/lib/data/loans'
import type { LoanFilters } from '@/lib/query-keys'
import { queryKeys } from '@/lib/query-keys'

export function useLoans(filters: LoanFilters = {}) {
  return useQuery({
    queryKey: queryKeys.loans.list(filters),
    queryFn: () => getLoans(filters),
  })
}

export function useLoan(id: string) {
  return useQuery({
    queryKey: queryKeys.loans.detail(id),
    queryFn: () => getLoanById(id),
    enabled: !!id,
  })
}
