import type { LoanFilters } from '@/lib/query-keys'
import { createClient } from '@/lib/supabase/server'
import type { LoanFull, LoanWithBorrower } from '@/types'
import { queryLoanById, queryLoans } from './loans-query'

export async function getLoans(filters?: LoanFilters): Promise<LoanWithBorrower[]> {
  return queryLoans(await createClient(), filters)
}

export async function getLoanById(id: string): Promise<LoanFull | null> {
  return queryLoanById(await createClient(), id)
}
