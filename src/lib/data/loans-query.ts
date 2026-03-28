import type { SupabaseClient } from '@supabase/supabase-js'
import type { LoanFilters } from '@/lib/query-keys'
import type { LoanFull, LoanWithBorrower } from '@/types'

export async function queryLoans(
  supabase: SupabaseClient,
  filters?: LoanFilters
): Promise<LoanWithBorrower[]> {
  let query = supabase
    .from('loans')
    .select('*, borrower:borrowers(*)')
    .order('created_at', { ascending: false })

  if (filters?.loanStatus && filters.loanStatus !== 'all') {
    query = query.eq('status', filters.loanStatus)
  }

  if (filters?.loanType && filters.loanType !== 'all') {
    query = query.eq('loan_type', filters.loanType)
  }

  const { data, error } = await query

  if (error) {
    console.error('getLoans error:', error)
    return []
  }

  let results = (data ?? []) as unknown as LoanWithBorrower[]

  if (filters?.loanSearch) {
    const term = filters.loanSearch.toLowerCase()
    results = results.filter((loan) => loan.borrower.full_name.toLowerCase().includes(term))
  }

  return results
}

export async function queryLoanById(
  supabase: SupabaseClient,
  id: string
): Promise<LoanFull | null> {
  const { data, error } = await supabase
    .from('loans')
    .select('*, borrower:borrowers(*), loan_schedules(*), payments(*)')
    .eq('id', id)
    .order('period_number', { referencedTable: 'loan_schedules', ascending: true })
    .order('paid_at', { referencedTable: 'payments', ascending: true })
    .single()

  if (error) {
    console.error('getLoanById error:', error)
    return null
  }

  return data as unknown as LoanFull
}
