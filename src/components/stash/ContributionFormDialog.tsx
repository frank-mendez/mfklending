'use client'

import { useQueryClient } from '@tanstack/react-query'
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
import { recordContribution } from '@/lib/actions/stash'
import { queryKeys } from '@/lib/query-keys'
import type { Partner } from '@/types'

const INITIAL_STATE: ActionState = { success: false, message: '' }

interface ContributionFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  partners: Partner[]
}

export function ContributionFormDialog({
  open,
  onOpenChange,
  partners,
}: ContributionFormDialogProps) {
  const queryClient = useQueryClient()
  const [state, formAction, isPending] = useActionState(recordContribution, INITIAL_STATE)
  const [partnerId, setPartnerId] = useState('')

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally only reacts to state.success
  useEffect(() => {
    if (state.success) {
      queryClient.invalidateQueries({ queryKey: queryKeys.stash.contributions() })
      queryClient.invalidateQueries({ queryKey: queryKeys.stash.summary() })
      setPartnerId('')
      onOpenChange(false)
    }
  }, [state.success])

  // Current YYYY-MM for default value
  const currentMonth = new Date().toISOString().slice(0, 7)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record Contribution</DialogTitle>
        </DialogHeader>

        {!state.success && state.message && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {state.message}
          </div>
        )}

        <form action={formAction} className="flex flex-col gap-4">
          {/* Partner */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="partner_id">Partner</Label>
            <input type="hidden" name="partner_id" value={partnerId} />
            <Select value={partnerId} onValueChange={setPartnerId} required>
              <SelectTrigger id="partner_id">
                <SelectValue placeholder="Select partner" />
              </SelectTrigger>
              <SelectContent>
                {partners.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {state.errors?.partner_id && (
              <p className="text-xs text-red-600">{state.errors.partner_id[0]}</p>
            )}
          </div>

          {/* Month */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="month">Month</Label>
            <Input id="month" name="month" type="month" defaultValue={currentMonth} required />
            {state.errors?.month && <p className="text-xs text-red-600">{state.errors.month[0]}</p>}
          </div>

          {/* Amount */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="amount_pesos">Amount (₱)</Label>
            <Input
              id="amount_pesos"
              name="amount_pesos"
              type="number"
              step="0.01"
              min="1"
              defaultValue="3000"
              required
            />
            {state.errors?.amount_pesos && (
              <p className="text-xs text-red-600">{state.errors.amount_pesos[0]}</p>
            )}
          </div>

          {/* Remarks */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="remarks">Remarks (optional)</Label>
            <Textarea
              id="remarks"
              name="remarks"
              placeholder="e.g. catch-up payment for 2 months..."
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
              {isPending ? 'Recording...' : 'Record'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
