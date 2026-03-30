import { BookOpen, Calculator, TrendingUp, Users } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
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
import type { FundSummary } from '@/types'

const PLACEHOLDER_CARDS = [
  {
    icon: TrendingUp,
    title: 'Interest Earned',
    description: 'Monthly and cumulative interest collected from all active loans.',
  },
  {
    icon: BookOpen,
    title: 'Loan Book',
    description: 'All loans grouped by status — active, paid, and defaulted.',
  },
  {
    icon: Users,
    title: 'Partner Equity',
    description: 'Stash contributed vs. dividends received per partner.',
  },
  {
    icon: Calculator,
    title: 'Dividend Calculator',
    description: 'Compute next dividend distribution based on current fund balance.',
  },
] as const

export default async function ReportsPage() {
  const supabase = await createClient()
  const { data } = await supabase.from('fund_summary').select('*').limit(1).maybeSingle()
  const summary = data as FundSummary | null

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Reports" subtitle="Fund health, partner equity, and loan analytics." />

      {/* Placeholder report cards — 2×2 grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        {PLACEHOLDER_CARDS.map(({ icon: Icon, title, description }) => (
          <Card key={title} className="opacity-70">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Icon className="h-4 w-4 text-muted-foreground" />
                {title}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <p className="text-sm text-muted-foreground">{description}</p>
              <span className="inline-flex w-fit items-center rounded-full border border-dashed px-2 py-0.5 text-xs text-muted-foreground">
                Coming soon
              </span>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Fund Summary table */}
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Fund Summary</h2>
        {summary ? (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Total Stash</TableHead>
                  <TableHead>Total Loaned</TableHead>
                  <TableHead>Interest Collected</TableHead>
                  <TableHead>Penalties</TableHead>
                  <TableHead>Dividends Paid</TableHead>
                  <TableHead>Current Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="tabular-nums font-medium">
                    {formatPHP(summary.total_stash)}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {formatPHP(summary.total_loaned_out)}
                  </TableCell>
                  <TableCell className="tabular-nums text-green-600">
                    {formatPHP(summary.total_collected_interest)}
                  </TableCell>
                  <TableCell className="tabular-nums text-orange-600">
                    {formatPHP(summary.total_penalties)}
                  </TableCell>
                  <TableCell className="tabular-nums text-red-600">
                    {formatPHP(summary.total_dividends_paid)}
                  </TableCell>
                  <TableCell className="tabular-nums font-bold">
                    {formatPHP(summary.current_balance)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Fund summary data is not available yet.</p>
        )}
      </section>
    </div>
  )
}
