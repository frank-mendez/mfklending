import { CheckCircle2, XCircle } from 'lucide-react'
import Link from 'next/link'
import { ReminderToggle } from '@/components/import/ReminderToggle'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { createClient } from '@/lib/supabase/server'
import { formatPHP } from '@/lib/utils/currency'
import { formatManila } from '@/lib/utils/date'

// Expected totals (as centavos)
const EXPECTED_TOTAL_STASH = 33300000 // ₱333,000
const EXPECTED_PER_PARTNER = 11100000 // ₱111,000
const EXPECTED_DIVIDENDS = 3000000 // ₱30,000 (Nov 2025)

function Check({ pass, label }: Readonly<{ pass: boolean; label: string }>) {
  return (
    <div className="flex items-center gap-2">
      {pass ? (
        <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
      ) : (
        <XCircle className="h-4 w-4 text-destructive shrink-0" />
      )}
      <span className={pass ? 'text-sm' : 'text-sm text-destructive'}>{label}</span>
    </div>
  )
}

export default async function VerifyPage() {
  const supabase = await createClient()
  const now = new Date()

  // ── Stash totals ────────────────────────────────────────────────────────────
  const { data: contributions } = await supabase
    .from('contributions')
    .select('partner_id, amount, partners(name)')

  type ContribRow = { partner_id: string; amount: number; partners: { name: string } | null }
  const contrib = (contributions ?? []) as unknown as ContribRow[]

  const totalStash = contrib.reduce((s, c) => s + c.amount, 0)
  const perPartner: Record<string, number> = {}
  for (const c of contrib) {
    const name = c.partners?.name ?? 'Unknown'
    perPartner[name] = (perPartner[name] ?? 0) + c.amount
  }

  const { data: dividends } = await supabase.from('dividends').select('amount')
  const totalDividends = (dividends ?? []).reduce(
    (s: number, d: { amount: number }) => s + d.amount,
    0
  )

  // ── Loan totals ─────────────────────────────────────────────────────────────
  const { data: loans } = await supabase
    .from('loans')
    .select(
      'id, loan_type, principal, status, reminders_enabled, borrowers(full_name), principal_returns(amount)'
    )

  type LoanRow = {
    id: string
    loan_type: string
    principal: number
    status: string
    reminders_enabled: boolean
    borrowers: { full_name: string } | null
    principal_returns: Array<{ amount: number }>
  }
  const allLoans = (loans ?? []) as unknown as LoanRow[]

  const activeLoans = allLoans.filter((l) => l.status === 'active')
  const paidLoans = allLoans.filter((l) => l.status === 'paid')
  const hybridLoans = allLoans.filter((l) => l.loan_type === 'hybrid_diminishing')

  // Outstanding balance per loan
  const loanRows = allLoans.map((l) => {
    const returned = l.principal_returns.reduce((s, pr) => s + pr.amount, 0)
    const outstanding = Math.max(0, l.principal - returned)
    return { ...l, outstanding }
  })

  const totalOutstanding = activeLoans.reduce((s, l) => {
    const returned = l.principal_returns.reduce((sum, pr) => sum + pr.amount, 0)
    return s + Math.max(0, l.principal - returned)
  }, 0)

  // ── Schedule readiness ──────────────────────────────────────────────────────
  const { data: pendingSchedules } = await supabase
    .from('loan_schedules')
    .select('loan_id')
    .eq('status', 'pending')

  const loansWithSchedule = new Set(
    (pendingSchedules ?? []).map((s: { loan_id: string }) => s.loan_id)
  )

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Verify Data"
        subtitle={`Last checked: ${formatManila(now, 'MMM d, yyyy HH:mm')}`}
        action={
          <Button asChild variant="outline" onClick={undefined}>
            <Link href="/import/verify">Refresh</Link>
          </Button>
        }
      />

      {/* Stash checks */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Stash Checks</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Check
            pass={totalStash === EXPECTED_TOTAL_STASH}
            label={`Total contributions = ${formatPHP(totalStash)} (expected ${formatPHP(EXPECTED_TOTAL_STASH)})`}
          />
          {['Frank', 'Francis', 'Kim'].map((p) => (
            <Check
              key={p}
              pass={(perPartner[p] ?? 0) === EXPECTED_PER_PARTNER}
              label={`${p} total = ${formatPHP(perPartner[p] ?? 0)} (expected ${formatPHP(EXPECTED_PER_PARTNER)})`}
            />
          ))}
          <Check
            pass={totalDividends === EXPECTED_DIVIDENDS}
            label={`Dividends distributed = ${formatPHP(totalDividends)} (expected ${formatPHP(EXPECTED_DIVIDENDS)})`}
          />
        </CardContent>
      </Card>

      {/* Loan checks */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Loan Checks</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <p className="text-sm">
              Total borrowers:{' '}
              <strong>{new Set(allLoans.map((l) => l.borrowers?.full_name)).size}</strong>
            </p>
            <p className="text-sm">
              Active loans: <strong>{activeLoans.length}</strong> — outstanding{' '}
              {formatPHP(totalOutstanding)}
            </p>
            <p className="text-sm">
              Paid loans: <strong>{paidLoans.length}</strong>
            </p>
            <p className="text-sm">
              Hybrid diminishing loans: <strong>{hybridLoans.length}</strong>
            </p>
          </div>

          <Table className="mt-2">
            <TableHeader>
              <TableRow>
                <TableHead>Borrower</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Principal</TableHead>
                <TableHead className="text-right">Outstanding</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Reminders</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loanRows.map((loan) => (
                <TableRow key={loan.id}>
                  <TableCell className="text-sm">{loan.borrowers?.full_name ?? '—'}</TableCell>
                  <TableCell className="text-xs text-muted-foreground capitalize">
                    {loan.loan_type.replace('_', ' ')}
                  </TableCell>
                  <TableCell className="text-right text-sm">{formatPHP(loan.principal)}</TableCell>
                  <TableCell className="text-right text-sm">
                    {formatPHP(loan.outstanding)}
                  </TableCell>
                  <TableCell>
                    <span
                      className={
                        loan.status === 'active'
                          ? 'text-xs font-medium text-green-700'
                          : 'text-xs font-medium text-muted-foreground'
                      }
                    >
                      {loan.status}
                    </span>
                  </TableCell>
                  <TableCell>
                    <ReminderToggle
                      loanId={loan.id}
                      enabled={loan.reminders_enabled}
                      hasSchedule={loansWithSchedule.has(loan.id)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
