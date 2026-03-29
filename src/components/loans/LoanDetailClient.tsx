'use client'

import { useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { PaymentScheduleTable } from '@/components/loans/PaymentScheduleTable'
import { CurrencyDisplay } from '@/components/shared/CurrencyDisplay'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useLoan } from '@/hooks/use-loans'
import { queryKeys } from '@/lib/query-keys'
import { cn } from '@/lib/utils'
import { formatPHP } from '@/lib/utils/currency'
import { formatManila } from '@/lib/utils/date'
import type { LoanFull } from '@/types'

interface LoanDetailClientProps {
  initialData: LoanFull
}

export function LoanDetailClient({ initialData }: LoanDetailClientProps) {
  const queryClient = useQueryClient()
  const { data: loanData = initialData } = useLoan(initialData.id)
  // useLoan can return null if the query hasn't fetched yet; fall back to initialData
  const loan: LoanFull = loanData ?? initialData

  const handlePaymentRecorded = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.loans.detail(initialData.id) })
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.summary() })
  }

  // Compute totals
  const totalPaid = loan.payments.reduce((sum, p) => sum + p.amount_paid, 0)
  const totalScheduled = loan.loan_schedules.reduce((sum, s) => sum + s.total_due, 0)
  const totalRemaining = Math.max(0, totalScheduled - totalPaid)

  return (
    <div className="flex flex-col gap-6">
      {/* Loan Header */}
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/dashboard/borrowers/${loan.borrower.id}`}
                className="text-2xl font-bold hover:underline"
              >
                {loan.borrower.full_name}
              </Link>
              <span
                className={cn(
                  'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium',
                  loan.loan_type === 'flat_interest'
                    ? 'border-blue-300 text-blue-700'
                    : 'border-purple-300 text-purple-700'
                )}
              >
                {loan.loan_type === 'flat_interest' ? 'Flat Interest' : 'Diminishing'}
              </span>
              <StatusBadge status={loan.status} />
              {/* Contract placeholder */}
              <Badge variant="outline" className="text-muted-foreground border-muted-foreground/40">
                Contract: Pending
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{formatManila(loan.start_date, 'MMM d, yyyy')}</span>
              <span>→</span>
              <span>{formatManila(loan.end_date, 'MMM d, yyyy')}</span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <p className="text-xs text-muted-foreground">Principal</p>
            <CurrencyDisplay centavos={loan.principal} size="lg" />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Schedule + History (left/main) */}
        <div className="flex flex-1 flex-col gap-6">
          {/* Payment Schedule */}
          <div className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold">Payment Schedule</h2>
            {loan.loan_schedules.length === 0 ? (
              <p className="text-sm text-muted-foreground">No schedule generated yet.</p>
            ) : (
              <PaymentScheduleTable
                schedules={loan.loan_schedules}
                loanId={loan.id}
                onPaymentRecorded={handlePaymentRecorded}
              />
            )}
          </div>

          {/* Payment History */}
          {loan.payments.length > 0 && (
            <div className="flex flex-col gap-3">
              <h2 className="text-lg font-semibold">Payment History</h2>
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Remarks</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loan.payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="text-sm">
                          {formatManila(payment.paid_at, 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell className="text-right text-sm font-mono">
                          {formatPHP(payment.amount_paid)}
                        </TableCell>
                        <TableCell className="text-sm capitalize">{payment.payment_type}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {payment.remarks ?? '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar (right) */}
        <div className="lg:w-72 shrink-0">
          <div className="sticky top-4 flex flex-col gap-4 rounded-xl border bg-card p-5 shadow-sm">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Loan Summary
            </h3>

            <div className="grid grid-cols-1 gap-3">
              <div className="flex flex-col gap-0.5">
                <p className="text-xs text-muted-foreground">Total Paid</p>
                <p className="text-lg font-semibold text-green-600">{formatPHP(totalPaid)}</p>
              </div>
              <div className="flex flex-col gap-0.5">
                <p className="text-xs text-muted-foreground">Total Remaining</p>
                <p
                  className={cn(
                    'text-lg font-semibold',
                    totalRemaining > 0 ? 'text-orange-600' : 'text-muted-foreground'
                  )}
                >
                  {formatPHP(totalRemaining)}
                </p>
              </div>
              <div className="flex flex-col gap-0.5 border-t pt-2">
                <p className="text-xs text-muted-foreground">Grand Total Due</p>
                <p className="text-lg font-semibold">{formatPHP(totalScheduled)}</p>
              </div>
            </div>

            <div className="border-t pt-3">
              <p className="text-xs text-muted-foreground mb-1.5">Contract</p>
              <Badge variant="outline" className="text-muted-foreground border-muted-foreground/40">
                Pending
              </Badge>
            </div>

            <div className="border-t pt-3 text-xs text-muted-foreground space-y-1">
              <div className="flex justify-between">
                <span>Interest Rate</span>
                <span>{(loan.interest_rate * 100).toFixed(0)}% / month</span>
              </div>
              <div className="flex justify-between">
                <span>Term</span>
                <span>{loan.term_months} month(s)</span>
              </div>
              <div className="flex justify-between">
                <span>Periods Paid</span>
                <span>
                  {loan.loan_schedules.filter((s) => s.status === 'paid').length} /{' '}
                  {loan.loan_schedules.length}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
