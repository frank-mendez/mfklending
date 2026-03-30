import type { SupabaseClient } from '@supabase/supabase-js'
import type { BankTransaction } from '@/types'

export async function queryTransactions(supabase: SupabaseClient): Promise<BankTransaction[]> {
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
