import { createClient } from '@/lib/supabase/client'
import { queryBorrowerById, queryBorrowers } from './borrowers-query'

export type { BorrowerDetail, BorrowerWithLoanCount } from './borrowers-query'

export async function getBorrowers() {
  return queryBorrowers(createClient())
}

export async function getBorrowerById(id: string) {
  return queryBorrowerById(createClient(), id)
}
