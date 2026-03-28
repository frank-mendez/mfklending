'use client'

import { AlertCircle, CheckCircle2 } from 'lucide-react'
import { useState } from 'react'
import { RecordPaymentDialog } from '@/components/loans/RecordPaymentDialog'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { calcLatePenalty } from '@/lib/finance'
import { cn } from '@/lib/utils'
import { formatPHP } from '@/lib/utils/currency'
import { daysOverdue, formatManila } from '@/lib/utils/date'
import type { LoanSchedule } from '@/types'

interface PaymentScheduleTableProps {
  schedules: LoanSchedule[]
  loanId: string
  onPaymentRecorded: () => void
}

export function PaymentScheduleTable({
  schedules,
  loanId,
  onPaymentRecorded,
}: PaymentScheduleTableProps) {
  const [selectedSchedule, setSelectedSchedule] = useState<LoanSchedule | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const openDialog = (schedule: LoanSchedule) => {
    setSelectedSchedule(schedule)
    setDialogOpen(true)
  }

  return (
    <>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Period</TableHead>
              <TableHead className="text-xs">Due Date</TableHead>
              <TableHead className="text-right text-xs">Principal Due</TableHead>
              <TableHead className="text-right text-xs">Interest Due</TableHead>
              <TableHead className="text-right text-xs">Total Due</TableHead>
              <TableHead className="text-right text-xs">Balance After</TableHead>
              <TableHead className="text-xs">Status</TableHead>
              <TableHead className="text-right text-xs">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {schedules.map((s) => {
              const isLate = s.status === 'late'
              const isPaid = s.status === 'paid'
              const overdueDays = isLate ? daysOverdue(s.due_date) : 0
              const penalty = isLate
                ? calcLatePenalty({
                    daysLate: overdueDays,
                    monthlyInterest: s.interest_due,
                  })
                : 0

              return (
                <TableRow
                  key={s.id}
                  className={cn(
                    isPaid && 'text-muted-foreground',
                    isLate && 'text-red-700 bg-red-50/50'
                  )}
                >
                  <TableCell className="text-sm">{s.period_number}</TableCell>
                  <TableCell className="text-sm">
                    {formatManila(s.due_date, 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell className="text-right text-sm font-mono">
                    {formatPHP(s.principal_due)}
                  </TableCell>
                  <TableCell className="text-right text-sm font-mono">
                    {formatPHP(s.interest_due)}
                  </TableCell>
                  <TableCell className="text-right text-sm font-mono">
                    {formatPHP(s.total_due)}
                  </TableCell>
                  <TableCell className="text-right text-sm font-mono">
                    {formatPHP(s.balance_after)}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      <StatusBadge status={s.status} />
                      {isLate && (
                        <span className="text-xs text-red-600 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {overdueDays}d late · {formatPHP(penalty)} penalty
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {isPaid ? (
                      <span className="inline-flex items-center gap-1 text-xs text-green-600">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Paid
                      </span>
                    ) : (
                      <Button
                        size="sm"
                        variant={isLate ? 'destructive' : 'outline'}
                        onClick={() => openDialog(s)}
                      >
                        Record Payment
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {selectedSchedule && (
        <RecordPaymentDialog
          schedule={selectedSchedule}
          loanId={loanId}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSuccess={onPaymentRecorded}
        />
      )}
    </>
  )
}
