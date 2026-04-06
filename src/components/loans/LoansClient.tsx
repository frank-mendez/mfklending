'use client'

import { useQueryClient } from '@tanstack/react-query'
import { Search } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { EmptyState } from '@/components/shared/EmptyState'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useLoans } from '@/hooks/use-loans'
import { queryKeys } from '@/lib/query-keys'
import { cn } from '@/lib/utils'
import { formatPHP } from '@/lib/utils/currency'
import { daysOverdue, formatManila } from '@/lib/utils/date'
import { useFiltersStore } from '@/stores/filters.store'
import type { ContractStatus, LoanWithBorrower } from '@/types'

function ContractBadge({ status }: { status: ContractStatus }) {
  if (status === 'none') return <span className="text-muted-foreground text-sm">—</span>
  if (status === 'pending_signature')
    return (
      <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300 border text-xs">
        Awaiting Signature
      </Badge>
    )
  if (status === 'signed')
    return (
      <Badge className="bg-green-100 text-green-800 border-green-300 border text-xs">Signed</Badge>
    )
  if (status === 'declined')
    return <Badge className="bg-red-100 text-red-800 border-red-300 border text-xs">Declined</Badge>
  if (status === 'expired')
    return (
      <Badge className="bg-orange-100 text-orange-800 border-orange-300 border text-xs">
        Expired
      </Badge>
    )
  return null
}

interface LoansClientProps {
  initialData: LoanWithBorrower[]
}

const STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'paid', label: 'Paid' },
  { value: 'defaulted', label: 'Defaulted' },
] as const

const TYPE_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'flat_interest', label: 'Flat Interest' },
  { value: 'diminishing', label: 'Diminishing' },
] as const

export function LoansClient({ initialData }: LoansClientProps) {
  const { loanStatus, loanType, loanSearch, setLoanStatus, setLoanType, setLoanSearch } =
    useFiltersStore()
  const queryClient = useQueryClient()

  // Local state for debounced search
  const [searchInput, setSearchInput] = useState(loanSearch)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setLoanSearch(searchInput)
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [searchInput, setLoanSearch])

  // Pre-populate cache with server data using the same key as the initial query
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally seeds once on mount; filter values match initial store state
  useEffect(() => {
    queryClient.setQueryData(
      queryKeys.loans.list({ loanStatus, loanType, loanSearch }),
      initialData
    )
  }, [queryClient, initialData])

  const { data: loans = initialData } = useLoans({ loanStatus, loanType, loanSearch })

  // Summary stats
  const activeLoans = loans.filter((l) => l.status === 'active')
  const overdueLoans = loans.filter((l) => l.status === 'overdue')
  const activePrincipalSum = activeLoans.reduce((sum, l) => sum + l.principal, 0)

  return (
    <div className="flex flex-col gap-6">
      {/* Filter Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {/* Status Filters */}
          <div className="flex items-center gap-1 rounded-lg border bg-muted/40 p-1">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setLoanStatus(opt.value as typeof loanStatus)}
                className={cn(
                  'rounded-md px-3 py-1 text-sm font-medium transition-colors',
                  loanStatus === opt.value
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {/* Type Filters */}
          <div className="flex items-center gap-1 rounded-lg border bg-muted/40 p-1">
            {TYPE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setLoanType(opt.value as typeof loanType)}
                className={cn(
                  'rounded-md px-3 py-1 text-sm font-medium transition-colors',
                  loanType === opt.value
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search borrower..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {/* Summary Bar */}
      <div className="grid grid-cols-3 gap-4 rounded-lg border bg-muted/20 p-4">
        <div className="flex flex-col gap-0.5">
          <p className="text-xs text-muted-foreground">Active Loans</p>
          <p className="text-lg font-semibold">{activeLoans.length}</p>
          <p className="text-xs text-muted-foreground">{formatPHP(activePrincipalSum)}</p>
        </div>
        <div className="flex flex-col gap-0.5">
          <p className="text-xs text-muted-foreground">Overdue</p>
          <p className="text-lg font-semibold text-red-600">{overdueLoans.length}</p>
        </div>
        <div className="flex flex-col gap-0.5">
          <p className="text-xs text-muted-foreground">Showing</p>
          <p className="text-lg font-semibold">{loans.length}</p>
          <p className="text-xs text-muted-foreground">total loans</p>
        </div>
      </div>

      {/* Table */}
      {loans.length === 0 ? (
        <EmptyState
          title="No loans found"
          description="No loans match your current filters."
          action={
            <Button asChild>
              <Link href="/loans/new">New Loan</Link>
            </Button>
          }
        />
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Borrower</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Principal</TableHead>
                <TableHead className="text-center">Term</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Contract</TableHead>
                <TableHead>Next Due</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loans.map((loan) => {
                const overdueDays = loan.status === 'overdue' ? daysOverdue(loan.end_date) : 0
                return (
                  <TableRow key={loan.id}>
                    <TableCell className="font-medium">{loan.borrower?.full_name ?? '—'}</TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium',
                          loan.loan_type === 'flat_interest'
                            ? 'border-blue-300 text-blue-700'
                            : 'border-purple-300 text-purple-700'
                        )}
                      >
                        {loan.loan_type === 'flat_interest' ? 'Flat' : 'Diminishing'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {formatPHP(loan.principal)}
                    </TableCell>
                    <TableCell className="text-center text-sm">{loan.term_months}mo</TableCell>
                    <TableCell className="text-sm">
                      {formatManila(loan.start_date, 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={loan.status} />
                    </TableCell>
                    <TableCell>
                      <ContractBadge status={loan.contract_status} />
                    </TableCell>
                    <TableCell className="text-sm">
                      {loan.status === 'overdue' ? (
                        <span className="font-medium text-red-600">
                          {formatManila(loan.end_date, 'MMM d, yyyy')}
                          <br />
                          <span className="text-xs">{overdueDays}d overdue</span>
                        </span>
                      ) : loan.status === 'paid' ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        formatManila(loan.end_date, 'MMM d, yyyy')
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/loans/${loan.id}`}>View</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
