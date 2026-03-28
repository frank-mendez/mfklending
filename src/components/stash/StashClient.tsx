'use client'

import { CheckCircle2, Clock } from 'lucide-react'
import { useState } from 'react'
import { PageHeader } from '@/components/shared/PageHeader'
import { ContributionFormDialog } from '@/components/stash/ContributionFormDialog'
import { ContributionGrid } from '@/components/stash/ContributionGrid'
import { DividendFormDialog } from '@/components/stash/DividendFormDialog'
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
import { useContributions, useDividends, usePartners, useStashSummary } from '@/hooks/use-stash'
import type { ContributionsByMonth, DividendsByDate, StashSummary } from '@/lib/data/stash'
import { formatPHP } from '@/lib/utils/currency'
import { currentMonthManila, formatManila } from '@/lib/utils/date'
import type { Partner } from '@/types'

const PARTNERS = ['Frank', 'Francis', 'Kim'] as const

interface StashClientProps {
  initialContributions: ContributionsByMonth[]
  initialDividends: DividendsByDate[]
  initialSummary: StashSummary
  initialPartners: Partner[]
}

export function StashClient({
  initialContributions,
  initialDividends,
  initialSummary,
  initialPartners,
}: StashClientProps) {
  const [contribDialogOpen, setContribDialogOpen] = useState(false)
  const [dividendDialogOpen, setDividendDialogOpen] = useState(false)

  const { data: contributions = initialContributions } = useContributions()
  const { data: dividends = initialDividends } = useDividends()
  const { data: summary = initialSummary } = useStashSummary()
  const { data: partners = initialPartners } = usePartners()

  const thisMonth = currentMonthManila()

  // Build a quick lookup: partnerName -> this month's contribution
  const thisMonthMap = new Map<string, number>()
  const thisMonthRow = contributions.find((row) => row.month === thisMonth)
  if (thisMonthRow) {
    for (const entry of thisMonthRow.contributions) {
      thisMonthMap.set(entry.partner_name, entry.amount)
    }
  }

  // Build per-partner totals lookup
  const partnerTotals = new Map<string, number>(
    summary.partners.map((p) => [p.partner_name, p.total])
  )

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Stash Fund"
        subtitle={`Grand total: ${formatPHP(summary.grandTotal)}`}
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setDividendDialogOpen(true)}>
              Record Dividend
            </Button>
            <Button onClick={() => setContribDialogOpen(true)}>Record Contribution</Button>
          </div>
        }
      />

      {/* Per-partner summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {PARTNERS.map((name) => {
          const total = partnerTotals.get(name) ?? 0
          const thisMonthAmount = thisMonthMap.get(name)
          const paid = thisMonthAmount !== undefined

          return (
            <Card key={name}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">{name}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                <p className="text-2xl font-bold tabular-nums">{formatPHP(total)}</p>
                <p className="text-xs text-muted-foreground">Total contributed</p>
                <div className="mt-1 flex items-center gap-1.5 text-sm">
                  {paid ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span className="text-green-600 font-medium">
                        Paid {formatPHP(thisMonthAmount ?? 0)}
                      </span>
                    </>
                  ) : (
                    <>
                      <Clock className="h-4 w-4 text-yellow-500" />
                      <span className="text-yellow-600 font-medium">Pending</span>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Contribution grid */}
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Monthly Contributions</h2>
        <ContributionGrid data={contributions} />
      </section>

      {/* Dividend history */}
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Dividend History</h2>
        {dividends.length === 0 ? (
          <p className="text-sm text-muted-foreground">No dividends recorded yet.</p>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  {PARTNERS.map((name) => (
                    <TableHead key={name} className="text-right">
                      {name}
                    </TableHead>
                  ))}
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dividends.map(({ distributed_at, dividends: entries }) => {
                  const partnerDivMap = new Map(entries.map((e) => [e.partner_name, e.amount]))
                  const total = entries.reduce((sum, e) => sum + e.amount, 0)

                  return (
                    <TableRow key={distributed_at}>
                      <TableCell className="font-medium">
                        {formatManila(distributed_at, 'MMM yyyy')}
                      </TableCell>
                      {PARTNERS.map((name) => (
                        <TableCell key={name} className="text-right tabular-nums">
                          {partnerDivMap.has(name) ? formatPHP(partnerDivMap.get(name) ?? 0) : '—'}
                        </TableCell>
                      ))}
                      <TableCell className="text-right font-semibold tabular-nums">
                        {formatPHP(total)}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      {/* Dialogs */}
      <ContributionFormDialog
        open={contribDialogOpen}
        onOpenChange={setContribDialogOpen}
        partners={partners}
      />
      <DividendFormDialog open={dividendDialogOpen} onOpenChange={setDividendDialogOpen} />
    </div>
  )
}
