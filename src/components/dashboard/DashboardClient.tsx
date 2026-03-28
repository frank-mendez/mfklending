'use client'

import { AlertTriangle, Banknote, TrendingUp, Wallet } from 'lucide-react'
import Link from 'next/link'
import { CashFlowChart } from '@/components/dashboard/CashFlowChart'
import { LoanCard } from '@/components/loans/LoanCard'
import { EmptyState } from '@/components/shared/EmptyState'
import { StatCard } from '@/components/shared/StatCard'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useActiveLoans, useFundSummary, useStashThisMonth } from '@/hooks/use-dashboard'
import type { StashThisMonthEntry } from '@/lib/data/dashboard'
import { formatPHP } from '@/lib/utils/currency'
import type { FundSummary, LoanWithBorrower } from '@/types'

interface DashboardClientProps {
  initialSummary: FundSummary | null
  initialActiveLoans: LoanWithBorrower[]
  initialStashThisMonth: StashThisMonthEntry[]
}

const PARTNERS = ['Frank', 'Francis', 'Kim']

export function DashboardClient({
  initialSummary,
  initialActiveLoans,
  initialStashThisMonth,
}: DashboardClientProps) {
  const { data: summary } = useFundSummary({ initialData: initialSummary ?? undefined })
  const { data: activeLoans = [] } = useActiveLoans(5, { initialData: initialActiveLoans })
  const { data: stashThisMonth = initialStashThisMonth } = useStashThisMonth()

  const totalPrincipal = activeLoans.reduce((sum, l) => sum + l.principal, 0)

  const overdueCount = activeLoans.filter((l) => l.status === 'overdue').length

  return (
    <div className="flex flex-col gap-6">
      {/* Row 1: Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Fund Balance"
          value={summary ? formatPHP(summary.current_balance) : '—'}
          subtitle="Available capital"
          icon={Wallet}
          trend="neutral"
        />
        <StatCard
          title="Active Loans"
          value={activeLoans.length}
          subtitle={formatPHP(totalPrincipal)}
          icon={Banknote}
        />
        <StatCard
          title="Collections This Month"
          value="—"
          subtitle="Calculated from payments"
          icon={TrendingUp}
          trend="neutral"
        />
        <StatCard
          title="Overdue Payments"
          value={overdueCount}
          subtitle={overdueCount === 1 ? '1 loan overdue' : `${overdueCount} loans overdue`}
          icon={AlertTriangle}
          trend={overdueCount > 0 ? 'down' : 'neutral'}
        />
      </div>

      {/* Row 2: Active Loans + Stash Status */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Active Loans */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Active Loans</CardTitle>
            <Link href="/dashboard/loans">
              <Button variant="ghost" size="sm" className="text-xs">
                View all loans →
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 pt-0">
            {activeLoans.length === 0 ? (
              <EmptyState title="No active loans" description="No loans are currently active." />
            ) : (
              activeLoans.map((loan) => <LoanCard key={loan.id} loan={loan} />)
            )}
          </CardContent>
        </Card>

        {/* Stash Status This Month */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Stash Status This Month</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 pt-0">
            {PARTNERS.map((partner) => {
              const entry = stashThisMonth.find(
                (e) => e.partner_name.toLowerCase() === partner.toLowerCase()
              )
              return (
                <div
                  key={partner}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex flex-col gap-0.5">
                    <p className="font-medium">{partner}</p>
                    {entry?.remarks && (
                      <p className="text-xs text-muted-foreground">{entry.remarks}</p>
                    )}
                  </div>
                  {entry ? (
                    <span className="font-semibold text-green-700">{formatPHP(entry.amount)}</span>
                  ) : (
                    <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">
                      Pending
                    </span>
                  )}
                </div>
              )
            })}
            <Link href="/dashboard/stash">
              <Button variant="ghost" size="sm" className="mt-1 w-full text-xs">
                View stash tracker →
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Cash Flow Chart */}
      <CashFlowChart />
    </div>
  )
}
