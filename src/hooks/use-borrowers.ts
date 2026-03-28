'use client'

import { useQuery } from '@tanstack/react-query'
import { getBorrowerById, getBorrowers } from '@/lib/data/borrowers'
import { queryKeys } from '@/lib/query-keys'

export function useBorrowers() {
  return useQuery({
    queryKey: queryKeys.borrowers.lists(),
    queryFn: getBorrowers,
  })
}

export function useBorrower(id: string) {
  return useQuery({
    queryKey: queryKeys.borrowers.detail(id),
    queryFn: () => getBorrowerById(id),
    enabled: !!id,
  })
}
