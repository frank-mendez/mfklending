'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useActionState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useBorrowers } from '@/hooks/use-borrowers'
import type { ActionState } from '@/lib/actions'
import { createLoan } from '@/lib/actions/loans'
import { generateSchedule, summarizeSchedule } from '@/lib/finance'
import { cn } from '@/lib/utils'
import { formatPHP, formatPHPCompact, toCentavos, toPesos } from '@/lib/utils/currency'
import { formatManila, todayManila } from '@/lib/utils/date'
import { useLoanFormStore } from '@/stores/loan-form.store'

const INITIAL_STATE: ActionState = { success: false, message: '' }

const STEPS = [
  { number: 1, label: 'Select Borrower' },
  { number: 2, label: 'Loan Details' },
  { number: 3, label: 'Review & Confirm' },
]

export default function NewLoanPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const store = useLoanFormStore()
  const { data: borrowers = [], isLoading: borrowersLoading } = useBorrowers()
  const [state, formAction, isPending] = useActionState(createLoan, INITIAL_STATE)

  // Reset form on mount — intentionally runs once on mount only
  // biome-ignore lint/correctness/useExhaustiveDependencies: mount-only effect
  useEffect(() => {
    store.reset()
    const borrowerIdParam = searchParams.get('borrowerId')
    if (borrowerIdParam) {
      store.setField('borrowerId', borrowerIdParam)
    }
    store.setField('startDate', todayManila())
  }, [])

  // Redirect on success
  useEffect(() => {
    if (state.success && state.data) {
      const data = state.data as { loanId: string }
      router.push(`/dashboard/loans/${data.loanId}`)
    }
  }, [state, router])

  // Ensure startDate is initialized
  const startDate = store.startDate || todayManila()

  // Generate live preview schedule
  const principalCentavos = store.principal > 0 ? store.principal : 0
  const canPreview = principalCentavos > 0 && store.termMonths > 0 && store.loanType !== null

  const previewSchedule = canPreview
    ? generateSchedule({
        loanType: store.loanType ?? 'flat_interest',
        principal: principalCentavos,
        rate: 0.05,
        termMonths: store.termMonths,
        startDate,
      })
    : []

  const previewSummary = previewSchedule.length > 0 ? summarizeSchedule(previewSchedule) : null

  const selectedBorrower = borrowers.find((b) => b.id === store.borrowerId)

  return (
    <div className="mx-auto max-w-2xl pb-16">
      {/* Step Indicator */}
      <div className="mb-8 flex items-center gap-0">
        {STEPS.map((step, index) => (
          <div key={step.number} className="flex flex-1 items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold',
                  store.step === step.number
                    ? 'bg-primary text-primary-foreground'
                    : store.step > step.number
                      ? 'bg-green-500 text-white'
                      : 'bg-muted text-muted-foreground'
                )}
              >
                {store.step > step.number ? '✓' : step.number}
              </div>
              <span
                className={cn(
                  'text-xs font-medium',
                  store.step === step.number ? 'text-foreground' : 'text-muted-foreground'
                )}
              >
                {step.label}
              </span>
            </div>
            {index < STEPS.length - 1 && (
              <div
                className={cn(
                  'mx-2 h-px flex-1 -translate-y-2',
                  store.step > step.number ? 'bg-green-500' : 'bg-border'
                )}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Select Borrower */}
      {store.step === 1 && (
        <div className="flex flex-col gap-6 rounded-xl border bg-card p-6 shadow-sm">
          <div>
            <h2 className="text-xl font-semibold">Select Borrower</h2>
            <p className="mt-1 text-sm text-muted-foreground">Choose the borrower for this loan.</p>
          </div>
          <div className="flex flex-col gap-2">
            <Label>Borrower</Label>
            {borrowersLoading ? (
              <div className="h-10 animate-pulse rounded-md bg-muted" />
            ) : (
              <Select
                value={store.borrowerId ?? ''}
                onValueChange={(val) => store.setField('borrowerId', val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a borrower..." />
                </SelectTrigger>
                <SelectContent>
                  {borrowers.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {borrowers.length === 0 && !borrowersLoading && (
              <p className="text-xs text-muted-foreground">
                No borrowers found.{' '}
                <Link href="/dashboard/borrowers/new" className="underline">
                  Add a borrower first.
                </Link>
              </p>
            )}
          </div>
          <div className="flex justify-between pt-2">
            <Button variant="outline" asChild>
              <Link href="/dashboard/loans">Back</Link>
            </Button>
            <Button disabled={!store.borrowerId} onClick={() => store.setStep(2)}>
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Loan Details */}
      {store.step === 2 && (
        <div className="flex flex-col gap-6 rounded-xl border bg-card p-6 shadow-sm">
          <div>
            <h2 className="text-xl font-semibold">Loan Details</h2>
            <p className="mt-1 text-sm text-muted-foreground">Configure the loan terms and type.</p>
          </div>

          {/* Loan Type */}
          <div className="flex flex-col gap-2">
            <Label>Loan Type</Label>
            <div className="grid grid-cols-2 gap-3">
              {[
                {
                  value: 'flat_interest' as const,
                  title: 'Flat Interest',
                  desc: 'Pay interest each month; full principal at end of term.',
                },
                {
                  value: 'diminishing' as const,
                  title: 'Diminishing Balance',
                  desc: 'Monthly payment reduces the outstanding principal.',
                },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => store.setField('loanType', opt.value)}
                  className={cn(
                    'flex flex-col gap-1 rounded-lg border p-4 text-left transition-all',
                    store.loanType === opt.value
                      ? 'ring-2 ring-primary border-primary bg-primary/5'
                      : 'hover:bg-muted/50'
                  )}
                >
                  <span className="font-medium text-sm">{opt.title}</span>
                  <span className="text-xs text-muted-foreground">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Principal */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="principal">Principal Amount (₱)</Label>
            <Input
              id="principal"
              type="number"
              min={1000}
              max={500000}
              step={100}
              placeholder="e.g. 30000"
              value={store.principal > 0 ? toPesos(store.principal) : ''}
              onChange={(e) => {
                const pesos = Number.parseFloat(e.target.value) || 0
                store.setField('principal', toCentavos(pesos))
              }}
            />
            <p className="text-xs text-muted-foreground">Min ₱1,000 · Max ₱500,000</p>
          </div>

          {/* Term */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="term">Loan Term (months)</Label>
            <Input
              id="term"
              type="number"
              min={1}
              max={36}
              value={store.termMonths}
              onChange={(e) =>
                store.setField('termMonths', Number.parseInt(e.target.value, 10) || 1)
              }
            />
            <p className="text-xs text-muted-foreground">Min 1 · Max 36 months</p>
          </div>

          {/* Start Date */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="startDate">Start Date</Label>
            <Input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => store.setField('startDate', e.target.value)}
            />
          </div>

          {/* Purpose */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="purpose">Purpose (optional)</Label>
            <Input
              id="purpose"
              type="text"
              placeholder="e.g. business capital, home repair"
              value={store.purpose}
              onChange={(e) => store.setField('purpose', e.target.value)}
            />
          </div>

          {/* Interest Rate (read-only) */}
          <div className="rounded-md bg-muted/40 px-4 py-3 text-sm">
            <span className="font-medium">Interest Rate:</span>{' '}
            <span className="text-muted-foreground">5% per month (MFK standard)</span>
          </div>

          {/* Live Schedule Preview */}
          {canPreview && previewSchedule.length > 0 && previewSummary && (
            <div className="flex flex-col gap-3">
              <h3 className="font-medium text-sm">Schedule Preview</h3>
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Period</TableHead>
                      <TableHead className="text-xs">Due Date</TableHead>
                      <TableHead className="text-right text-xs">Principal</TableHead>
                      <TableHead className="text-right text-xs">Interest</TableHead>
                      <TableHead className="text-right text-xs">Total</TableHead>
                      <TableHead className="text-right text-xs">Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewSchedule.map((entry) => (
                      <TableRow key={entry.periodNumber}>
                        <TableCell className="text-xs">{entry.periodNumber}</TableCell>
                        <TableCell className="text-xs">
                          {formatManila(entry.dueDate, 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell className="text-right text-xs font-mono">
                          {formatPHPCompact(entry.principalDue)}
                        </TableCell>
                        <TableCell className="text-right text-xs font-mono">
                          {formatPHPCompact(entry.interestDue)}
                        </TableCell>
                        <TableCell className="text-right text-xs font-mono">
                          {formatPHPCompact(entry.totalDue)}
                        </TableCell>
                        <TableCell className="text-right text-xs font-mono">
                          {formatPHPCompact(entry.balanceAfter)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="flex justify-between rounded-md bg-muted/40 px-4 py-2 text-sm">
                <span>
                  Total Interest:{' '}
                  <span className="font-medium">{formatPHP(previewSummary.totalInterest)}</span>
                </span>
                <span>
                  Total Repayment:{' '}
                  <span className="font-medium">{formatPHP(previewSummary.totalRepayment)}</span>
                </span>
              </div>
            </div>
          )}

          <div className="flex justify-between pt-2">
            <Button variant="outline" onClick={() => store.setStep(1)}>
              Back
            </Button>
            <Button
              disabled={!store.loanType || store.principal <= 0 || store.termMonths <= 0}
              onClick={() => store.setStep(3)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Review & Confirm */}
      {store.step === 3 && (
        <div className="flex flex-col gap-6 rounded-xl border bg-card p-6 shadow-sm">
          <div>
            <h2 className="text-xl font-semibold">Review & Confirm</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Please review the loan details before submitting.
            </p>
          </div>

          {/* Summary Card */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 rounded-lg border bg-muted/20 p-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Borrower</p>
              <p className="font-medium">{selectedBorrower?.full_name ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Loan Type</p>
              <p className="font-medium">
                {store.loanType === 'flat_interest' ? 'Flat Interest' : 'Diminishing Balance'}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Principal</p>
              <p className="font-medium">{formatPHP(store.principal)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Term</p>
              <p className="font-medium">{store.termMonths} month(s)</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Start Date</p>
              <p className="font-medium">{formatManila(startDate, 'MMM d, yyyy')}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Interest Rate</p>
              <p className="font-medium">5% per month</p>
            </div>
            {store.purpose && (
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground">Purpose</p>
                <p className="font-medium">{store.purpose}</p>
              </div>
            )}
          </div>

          {/* Full Schedule */}
          {previewSchedule.length > 0 && previewSummary && (
            <div className="flex flex-col gap-3">
              <h3 className="font-medium text-sm">Payment Schedule</h3>
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Period</TableHead>
                      <TableHead className="text-xs">Due Date</TableHead>
                      <TableHead className="text-right text-xs">Principal</TableHead>
                      <TableHead className="text-right text-xs">Interest</TableHead>
                      <TableHead className="text-right text-xs">Total</TableHead>
                      <TableHead className="text-right text-xs">Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewSchedule.map((entry) => (
                      <TableRow key={entry.periodNumber}>
                        <TableCell className="text-xs">{entry.periodNumber}</TableCell>
                        <TableCell className="text-xs">
                          {formatManila(entry.dueDate, 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell className="text-right text-xs font-mono">
                          {formatPHP(entry.principalDue)}
                        </TableCell>
                        <TableCell className="text-right text-xs font-mono">
                          {formatPHP(entry.interestDue)}
                        </TableCell>
                        <TableCell className="text-right text-xs font-mono">
                          {formatPHP(entry.totalDue)}
                        </TableCell>
                        <TableCell className="text-right text-xs font-mono">
                          {formatPHP(entry.balanceAfter)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="flex justify-between rounded-md bg-muted/40 px-4 py-2 text-sm font-medium">
                <span>Total Interest: {formatPHP(previewSummary.totalInterest)}</span>
                <span>Total Repayment: {formatPHP(previewSummary.totalRepayment)}</span>
              </div>
            </div>
          )}

          {/* Error */}
          {!state.success && state.message && (
            <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {state.message}
            </div>
          )}

          {/* Hidden form for server action */}
          <form action={formAction} className="contents">
            <input type="hidden" name="borrower_id" value={store.borrowerId ?? ''} />
            <input type="hidden" name="loan_type" value={store.loanType ?? ''} />
            <input type="hidden" name="principal_pesos" value={toPesos(store.principal)} />
            <input type="hidden" name="term_months" value={store.termMonths} />
            <input type="hidden" name="start_date" value={startDate} />
            <input type="hidden" name="purpose" value={store.purpose} />

            <div className="flex justify-between pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => store.setStep(2)}
                disabled={isPending}
              >
                Back
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Creating...' : 'Confirm & Create Loan'}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
