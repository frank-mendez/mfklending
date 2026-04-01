import type { LoanStatus, LoanType } from '@/types'

export interface LoanFilters {
  loanStatus?: LoanStatus | 'all'
  loanType?: LoanType | 'all'
  loanSearch?: string
}

export const queryKeys = {
  loans: {
    all: ['loans'] as const,
    lists: () => [...queryKeys.loans.all, 'list'] as const,
    list: (filters: LoanFilters) => [...queryKeys.loans.lists(), filters] as const,
    detail: (id: string) => [...queryKeys.loans.all, 'detail', id] as const,
  },
  borrowers: {
    all: ['borrowers'] as const,
    lists: () => [...queryKeys.borrowers.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.borrowers.all, 'detail', id] as const,
  },
  stash: {
    all: ['stash'] as const,
    contributions: () => [...queryKeys.stash.all, 'contributions'] as const,
    dividends: () => [...queryKeys.stash.all, 'dividends'] as const,
    summary: () => [...queryKeys.stash.all, 'summary'] as const,
  },
  dashboard: {
    all: ['dashboard'] as const,
    summary: () => [...queryKeys.dashboard.all, 'summary'] as const,
    cashflow: (months: number) => [...queryKeys.dashboard.all, 'cashflow', months] as const,
  },
  transactions: {
    all: ['transactions'] as const,
    list: () => [...queryKeys.transactions.all, 'list'] as const,
  },
  notifications: {
    all: ['notifications'] as const,
    recent: () => [...queryKeys.notifications.all, 'recent'] as const,
  },
} as const
