import { createClient } from '@/lib/supabase/server'
import type { BankTransaction } from '@/types'

export async function getTransactions(): Promise<BankTransaction[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('bank_transactions')
    .select('*')
    .order('transaction_date', { ascending: false })

  if (error) {
    console.error('getTransactions error:', error)
    return []
  }

  return (data ?? []) as BankTransaction[]
}
