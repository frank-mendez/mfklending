import { create } from 'zustand'
import type { LoanStatus, LoanType } from '@/types'

type LoanStatusFilter = LoanStatus | 'all'
type LoanTypeFilter = LoanType | 'all'

interface FiltersStore {
  loanStatus: LoanStatusFilter
  loanType: LoanTypeFilter
  loanSearch: string
  setLoanStatus: (status: LoanStatusFilter) => void
  setLoanType: (type: LoanTypeFilter) => void
  setLoanSearch: (search: string) => void
  resetLoanFilters: () => void
}

export const useFiltersStore = create<FiltersStore>((set) => ({
  loanStatus: 'all',
  loanType: 'all',
  loanSearch: '',
  setLoanStatus: (status) => set({ loanStatus: status }),
  setLoanType: (type) => set({ loanType: type }),
  setLoanSearch: (search) => set({ loanSearch: search }),
  resetLoanFilters: () => set({ loanStatus: 'all', loanType: 'all', loanSearch: '' }),
}))
