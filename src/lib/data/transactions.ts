import { createClient } from '@/lib/supabase/client'
import { queryTransactions } from './transactions-query'

export async function getTransactions() {
  return queryTransactions(createClient())
}
