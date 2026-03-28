import { createClient } from '@/lib/supabase/client'
import type { BankTransaction } from '@/types'

export async function getTransactions(): Promise<BankTransaction[]> {
  const supabase = createClient()
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
