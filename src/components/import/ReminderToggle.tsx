'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'
import { toggleReminders } from '@/lib/actions/loans'

type ReminderToggleProps = Readonly<{
  loanId: string
  enabled: boolean
  hasSchedule: boolean
}>

export function ReminderToggle({ loanId, enabled, hasSchedule }: ReminderToggleProps) {
  const [pending, startTransition] = useTransition()

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.checked
    startTransition(async () => {
      const result = await toggleReminders(loanId, next)
      if (result.success) {
        toast.success(result.message)
      } else {
        toast.error(result.message)
      }
    })
  }

  const disabled = pending || (!enabled && !hasSchedule)

  return (
    <div className="flex items-center gap-1.5">
      <input
        type="checkbox"
        checked={enabled}
        onChange={handleChange}
        disabled={disabled}
        aria-label="Toggle reminders"
        className="h-4 w-4 cursor-pointer accent-green-600 disabled:cursor-not-allowed disabled:opacity-50"
      />
      <span className="text-xs text-muted-foreground">
        {enabled ? (
          <span className="font-medium text-green-700">on</span>
        ) : hasSchedule ? (
          'off'
        ) : (
          <span title="No pending schedule entries">—</span>
        )}
      </span>
    </div>
  )
}
