'use client'

import { useActionState, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { ActionState } from '@/lib/actions'
import { recordPayment } from '@/lib/actions/loans'
import { calcLatePenalty } from '@/lib/finance'
import { formatPHP, toPesos } from '@/lib/utils/currency'
import { daysOverdue, formatManila, todayManila } from '@/lib/utils/date'
import type { LoanSchedule, PaymentType } from '@/types'

const INITIAL_STATE: ActionState = { success: false, message: '' }

interface RecordPaymentDialogProps {
  schedule: LoanSchedule
  loanId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function RecordPaymentDialog({
  schedule,
  loanId,
  open,
  onOpenChange,
  onSuccess,
}: RecordPaymentDialogProps) {
  const [state, formAction, isPending] = useActionState(recordPayment, INITIAL_STATE)
  const [paymentType, setPaymentType] = useState<PaymentType>('full')
  const [remarks, setRemarks] = useState('')

  const isLate = schedule.status === 'late'
  const overdueDays = isLate ? daysOverdue(schedule.due_date) : 0
  const penalty = isLate
    ? calcLatePenalty({ daysLate: overdueDays, monthlyInterest: schedule.interest_due })
    : 0
  const totalWithPenalty = schedule.total_due + penalty

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally only reacts to state.success
  useEffect(() => {
    if (state.success) {
      onSuccess()
      onOpenChange(false)
    }
  }, [state.success])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record Payment — Period {schedule.period_number}</DialogTitle>
        </DialogHeader>

        {/* Period details */}
        <div className="rounded-md bg-muted/40 p-3 text-sm space-y-1">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Due Date</span>
            <span>{formatManila(schedule.due_date, 'MMM d, yyyy')}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Principal Due</span>
            <span>{formatPHP(schedule.principal_due)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Interest Due</span>
            <span>{formatPHP(schedule.interest_due)}</span>
          </div>
          <div className="flex justify-between font-medium">
            <span className="text-muted-foreground">Total Due</span>
            <span>{formatPHP(schedule.total_due)}</span>
          </div>
          {isLate && (
            <>
              <div className="border-t pt-1 flex justify-between text-red-600">
                <span>Days Overdue</span>
                <span>{overdueDays} days</span>
              </div>
              <div className="flex justify-between text-red-600">
                <span>Penalty (1%/day)</span>
                <span>{formatPHP(penalty)}</span>
              </div>
              <div className="flex justify-between font-semibold text-red-600">
                <span>Total with Penalty</span>
                <span>{formatPHP(totalWithPenalty)}</span>
              </div>
            </>
          )}
        </div>

        {!state.success && state.message && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {state.message}
          </div>
        )}

        <form action={formAction} className="flex flex-col gap-4">
          {/* Hidden fields */}
          <input type="hidden" name="loan_id" value={loanId} />
          <input type="hidden" name="schedule_id" value={schedule.id} />
          <input type="hidden" name="payment_type" value={paymentType} />
          <input type="hidden" name="remarks" value={remarks} />

          {/* Amount */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="amount_paid_pesos">Amount Paid (₱)</Label>
            <Input
              id="amount_paid_pesos"
              name="amount_paid_pesos"
              type="number"
              step="0.01"
              min="0.01"
              defaultValue={toPesos(totalWithPenalty).toFixed(2)}
            />
          </div>

          {/* Payment Date */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="paid_at">Payment Date</Label>
            <Input id="paid_at" name="paid_at" type="date" defaultValue={todayManila()} />
          </div>

          {/* Payment Type */}
          <div className="flex flex-col gap-1.5">
            <Label>Payment Type</Label>
            <Select value={paymentType} onValueChange={(v) => setPaymentType(v as PaymentType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="full">Full</SelectItem>
                <SelectItem value="interest">Interest Only</SelectItem>
                <SelectItem value="principal">Principal Only</SelectItem>
                <SelectItem value="penalty">Penalty</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Remarks */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="remarks-input">Remarks (optional)</Label>
            <Textarea
              id="remarks-input"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. paid via GCash, catch-up payment..."
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Recording...' : 'Record Payment'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
