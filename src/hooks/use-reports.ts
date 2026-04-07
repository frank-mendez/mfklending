'use client'

import { useQuery } from '@tanstack/react-query'
import { getInterestEarned } from '@/lib/data/reports'
import { queryKeys } from '@/lib/query-keys'
import type { InterestEarnedParams, InterestEarnedRow } from '@/types'

export function useInterestEarned(
  params: InterestEarnedParams,
  options?: { initialData?: InterestEarnedRow[] }
) {
  return useQuery({
    queryKey: queryKeys.reports.interestEarned(params),
    queryFn: () => getInterestEarned(params),
    initialData: options?.initialData,
  })
}
