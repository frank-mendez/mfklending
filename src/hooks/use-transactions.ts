'use client'

import { useQuery } from '@tanstack/react-query'
import { getTransactions } from '@/lib/data/transactions'
import { queryKeys } from '@/lib/query-keys'

export function useTransactions() {
  return useQuery({
    queryKey: queryKeys.transactions.list(),
    queryFn: getTransactions,
  })
}
