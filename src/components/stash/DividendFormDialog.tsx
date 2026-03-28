'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useActionState, useEffect } from 'react'
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
import { Textarea } from '@/components/ui/textarea'
import type { ActionState } from '@/lib/actions'
import { recordDividend } from '@/lib/actions/stash'
import { queryKeys } from '@/lib/query-keys'

const INITIAL_STATE: ActionState = { success: false, message: '' }

interface DividendFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DividendFormDialog({ open, onOpenChange }: DividendFormDialogProps) {
  const queryClient = useQueryClient()
  const [state, formAction, isPending] = useActionState(recordDividend, INITIAL_STATE)

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally only reacts to state.success
  useEffect(() => {
    if (state.success) {
      queryClient.invalidateQueries({ queryKey: queryKeys.stash.dividends() })
      queryClient.invalidateQueries({ queryKey: queryKeys.stash.summary() })
      onOpenChange(false)
    }
  }, [state.success])

  const currentMonth = new Date().toISOString().slice(0, 7)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record Dividend Distribution</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          This will record the same dividend amount for all three partners (Frank, Francis, Kim).
        </p>

        {!state.success && state.message && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {state.message}
          </div>
        )}

        <form action={formAction} className="flex flex-col gap-4">
          {/* Month */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="month">Month</Label>
            <Input id="month" name="month" type="month" defaultValue={currentMonth} required />
            {state.errors?.month && <p className="text-xs text-red-600">{state.errors.month[0]}</p>}
          </div>

          {/* Amount Each */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="amount_each_pesos">Amount Each (₱)</Label>
            <Input
              id="amount_each_pesos"
              name="amount_each_pesos"
              type="number"
              step="0.01"
              min="1"
              placeholder="10000"
              required
            />
            {state.errors?.amount_each_pesos && (
              <p className="text-xs text-red-600">{state.errors.amount_each_pesos[0]}</p>
            )}
          </div>

          {/* Remarks */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="remarks">Remarks (optional)</Label>
            <Textarea
              id="remarks"
              name="remarks"
              placeholder="e.g. Q4 2025 dividend distribution..."
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
              {isPending ? 'Recording...' : 'Record Dividends'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
