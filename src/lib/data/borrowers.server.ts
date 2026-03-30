import { createClient } from '@/lib/supabase/server'
import { queryBorrowerById, queryBorrowers } from './borrowers-query'

export type { BorrowerDetail, BorrowerWithLoanCount } from './borrowers-query'

export async function getBorrowers() {
  return queryBorrowers(await createClient())
}

export async function getBorrowerById(id: string) {
  return queryBorrowerById(await createClient(), id)
}
