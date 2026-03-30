'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useActionState, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import type { ActionState } from '@/lib/actions'
import { createBorrower } from '@/lib/actions/borrowers'
import { queryKeys } from '@/lib/query-keys'

const BANK_OPTIONS = ['BPI', 'BDO', 'Metrobank', 'UnionBank', 'GoTyme', 'Maya', 'GCash', 'Other']

const initialState: ActionState = { success: false, message: '' }

function FieldError({ errors, field }: { errors?: Record<string, string[]>; field: string }) {
  const msgs = errors?.[field]
  if (!msgs?.length) return null
  return <p className="text-xs text-red-600">{msgs[0]}</p>
}

export function BorrowerFormDialog() {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const [state, formAction, isPending] = useActionState(createBorrower, initialState)
  const [bankName, setBankName] = useState('')

  useEffect(() => {
    if (state.success) {
      setOpen(false)
      queryClient.invalidateQueries({ queryKey: queryKeys.borrowers.lists() })
    }
  }, [state.success, queryClient])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">Add Borrower</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add New Borrower</DialogTitle>
        </DialogHeader>

        {state.message && !state.success && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.message}</p>
        )}

        <form action={formAction} className="flex flex-col gap-4">
          {/* Full Name */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="full_name">Full Name</Label>
            <Input id="full_name" name="full_name" placeholder="Juan dela Cruz" />
            <FieldError errors={state.errors} field="full_name" />
          </div>

          {/* Age + Occupation */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="age">Age</Label>
              <Input id="age" name="age" type="number" min={18} max={100} placeholder="30" />
              <FieldError errors={state.errors} field="age" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="occupation">Occupation</Label>
              <Input id="occupation" name="occupation" placeholder="Teacher" />
              <FieldError errors={state.errors} field="occupation" />
            </div>
          </div>

          {/* Email */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" placeholder="juan@email.com" />
            <FieldError errors={state.errors} field="email" />
          </div>

          {/* Phone */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" name="phone" placeholder="09XX XXX XXXX" />
            <FieldError errors={state.errors} field="phone" />
          </div>

          {/* Bank Name */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bank_name">Bank</Label>
            <input type="hidden" name="bank_name" value={bankName} />
            <Select onValueChange={setBankName}>
              <SelectTrigger id="bank_name">
                <SelectValue placeholder="Select a bank" />
              </SelectTrigger>
              <SelectContent>
                {BANK_OPTIONS.map((bank) => (
                  <SelectItem key={bank} value={bank}>
                    {bank}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError errors={state.errors} field="bank_name" />
          </div>

          {/* Account Name */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="account_name">Account Name</Label>
            <Input id="account_name" name="account_name" placeholder="Juan dela Cruz" />
            <FieldError errors={state.errors} field="account_name" />
          </div>

          {/* Account Number */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="account_number">Account Number</Label>
            <Input id="account_number" name="account_number" placeholder="1234567890" />
            <FieldError errors={state.errors} field="account_number" />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Saving…' : 'Add Borrower'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
