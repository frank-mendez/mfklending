import { createClient } from '@/lib/supabase/server'
import type { BankTransaction } from '@/types'
import { queryTransactions } from './transactions-query'

export async function getTransactions(): Promise<BankTransaction[]> {
  return queryTransactions(await createClient())
}
