import { createClient } from '@/lib/supabase/server'
import type { Borrower, Loan } from '@/types'
import type { BorrowerDetail, BorrowerWithLoanCount } from './borrowers'

export type { BorrowerDetail, BorrowerWithLoanCount } from './borrowers'

export async function getBorrowers(): Promise<BorrowerWithLoanCount[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('borrowers')
    .select('*, loans(id, status)')
    .order('full_name', { ascending: true })

  if (error) {
    console.error('getBorrowers error:', error)
    return []
  }

  return (data ?? []).map((row) => {
    const loans = (row.loans ?? []) as { id: string; status: string }[]
    const activeLoansCount = loans.filter(
      (l) => l.status === 'active' || l.status === 'overdue'
    ).length
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { loans: _loans, ...borrower } = row
    return { ...borrower, activeLoansCount } as BorrowerWithLoanCount
  })
}

export async function getBorrowerById(id: string): Promise<BorrowerDetail | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('borrowers')
    .select('*, loans(*)')
    .eq('id', id)
    .single()

  if (error) {
    console.error('getBorrowerById error:', error)
    return null
  }

  if (!data) return null

  const { loans, ...borrower } = data
  return {
    borrower: borrower as Borrower,
    loans: (loans ?? []) as Loan[],
  }
}
