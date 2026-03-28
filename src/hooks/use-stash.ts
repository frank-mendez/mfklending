'use client'

import { useQuery } from '@tanstack/react-query'
import { getContributions, getDividends, getPartners, getStashSummary } from '@/lib/data/stash'
import { queryKeys } from '@/lib/query-keys'

export function useContributions() {
  return useQuery({
    queryKey: queryKeys.stash.contributions(),
    queryFn: getContributions,
  })
}

export function useDividends() {
  return useQuery({
    queryKey: queryKeys.stash.dividends(),
    queryFn: getDividends,
  })
}

export function useStashSummary() {
  return useQuery({
    queryKey: queryKeys.stash.summary(),
    queryFn: getStashSummary,
  })
}

export function usePartners() {
  return useQuery({
    queryKey: [...queryKeys.stash.all, 'partners'] as const,
    queryFn: getPartners,
  })
}
