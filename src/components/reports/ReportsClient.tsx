'use client'

import { BookOpen, Calculator, Download, Printer, TrendingUp, Users, Wallet } from 'lucide-react'
import { useState } from 'react'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatCard } from '@/components/shared/StatCard'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useInterestEarned } from '@/hooks/use-reports'
import { formatPHP, formatPHPCompact } from '@/lib/utils/currency'
import { formatManila } from '@/lib/utils/date'
import type {
  DividendRow,
  FundHealthSummary,
  InterestEarnedRow,
  LoanBookRow,
  LoanType,
  PartnerEquityRow,
} from '@/types'
import { InterestEarnedChart } from './InterestEarnedChart'

const LOAN_TYPE_LABELS: Record<LoanType, string> = {
  flat_interest: 'Flat Interest',
  diminishing: 'Diminishing',
  hybrid_diminishing: 'Hybrid',
}

function ExportButton({ href, label }: { href: string; label: string }) {
  return (
    <Button variant="outline" size="sm" asChild className="print:hidden">
      <a href={href} download>
        <Download className="h-4 w-4 mr-1.5" />
        {label}
      </a>
    </Button>
  )
}

// ─── Fund Health Tab ──────────────────────────────────────────────────────────

function FundHealthTab({ data }: { data: FundHealthSummary }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Current Balance"
          value={formatPHPCompact(data.currentBalance)}
          subtitle={`Total stash: ${formatPHPCompact(data.totalStash)}`}
          icon={Wallet}
          trend="up"
        />
        <StatCard
          title="Interest Collected"
          value={formatPHPCompact(data.totalInterestCollected)}
          subtitle={`+ ${formatPHPCompact(data.totalPenaltiesCollected)} penalties`}
          icon={TrendingUp}
          trend="up"
        />
        <StatCard
          title="Outstanding Loans"
          value={formatPHPCompact(data.totalOutstandingBalance)}
          subtitle={`${data.activeLoans} active · ${data.overdueLoans} overdue`}
          icon={BookOpen}
        />
        <StatCard
          title="Return on Stash"
          value={`${data.roi.toFixed(1)}%`}
          subtitle={`${data.paidLoans} loans fully paid`}
          icon={Calculator}
          trend="up"
        />
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Fund Summary</h2>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Metric</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[
                { label: 'Total Stash Contributed', value: data.totalStash },
                { label: 'Total Principal Loaned (all-time)', value: data.totalPrincipalLoaned },
                {
                  label: 'Outstanding Balance (active loans)',
                  value: data.totalOutstandingBalance,
                },
                { label: 'Total Interest Collected', value: data.totalInterestCollected },
                { label: 'Total Penalties Collected', value: data.totalPenaltiesCollected },
                { label: 'Total Dividends Paid', value: data.totalDividendsPaid },
                { label: 'Current Balance', value: data.currentBalance },
              ].map(({ label, value }) => (
                <TableRow key={label}>
                  <TableCell className="font-medium">{label}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatPHP(value)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  )
}

// ─── Interest Earned Tab ──────────────────────────────────────────────────────

function InterestEarnedTab({
  initialData,
  years,
  defaultYear,
}: {
  initialData: InterestEarnedRow[]
  years: number[]
  defaultYear: number
}) {
  const [year, setYear] = useState(defaultYear)
  const [groupBy, setGroupBy] = useState<'month' | 'quarter' | 'year'>('month')

  const { data = initialData, isLoading } = useInterestEarned(
    { year, groupBy },
    { initialData: year === defaultYear && groupBy === 'month' ? initialData : undefined }
  )

  const totalInterest = data.reduce((sum, r) => sum + r.interestCollected, 0)
  const totalPenalties = data.reduce((sum, r) => sum + r.penaltiesCollected, 0)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Select value={String(year)} onValueChange={(v) => setYear(parseInt(v))}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={groupBy} onValueChange={(v) => setGroupBy(v as typeof groupBy)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">By Month</SelectItem>
              <SelectItem value="quarter">By Quarter</SelectItem>
              <SelectItem value="year">By Year</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <ExportButton
          href={`/api/reports/export?type=interest-earned&year=${year}&groupBy=${groupBy}`}
          label="Export CSV"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm font-medium text-muted-foreground">Interest Collected</p>
            {isLoading ? (
              <Skeleton className="h-9 w-32 mt-1" />
            ) : (
              <p className="text-3xl font-bold tracking-tight">{formatPHPCompact(totalInterest)}</p>
            )}
            <p className="text-sm text-muted-foreground">{year}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm font-medium text-muted-foreground">Penalties Collected</p>
            {isLoading ? (
              <Skeleton className="h-9 w-32 mt-1" />
            ) : (
              <p className="text-3xl font-bold tracking-tight">
                {formatPHPCompact(totalPenalties)}
              </p>
            )}
            <p className="text-sm text-muted-foreground">{year}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Interest & Penalties — {year}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? <Skeleton className="h-64 w-full" /> : <InterestEarnedChart data={data} />}
        </CardContent>
      </Card>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Breakdown</h2>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Period</TableHead>
                <TableHead className="text-right">Interest (PHP)</TableHead>
                <TableHead className="text-right">Penalties (PHP)</TableHead>
                <TableHead className="text-right">Total (PHP)</TableHead>
                <TableHead className="text-right">Loans</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row) => (
                <TableRow key={row.period}>
                  <TableCell className="font-medium">{row.period}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatPHP(row.interestCollected)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatPHP(row.penaltiesCollected)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-semibold">
                    {formatPHP(row.totalCollected)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{row.loanCount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  )
}

// ─── Loan Book Tab ────────────────────────────────────────────────────────────

type LoanStatusFilter = 'all' | 'active' | 'paid' | 'overdue' | 'defaulted'
type LoanTypeFilter = 'all' | 'flat_interest' | 'diminishing' | 'hybrid_diminishing'

function LoanBookTab({ data, years }: { data: LoanBookRow[]; years: number[] }) {
  const [statusFilter, setStatusFilter] = useState<LoanStatusFilter>('all')
  const [typeFilter, setTypeFilter] = useState<LoanTypeFilter>('all')
  const [yearFilter, setYearFilter] = useState<string>('all')

  const filtered = data.filter((row) => {
    if (statusFilter !== 'all' && row.status !== statusFilter) return false
    if (typeFilter !== 'all' && row.loanType !== typeFilter) return false
    if (yearFilter !== 'all' && !row.startDate.startsWith(yearFilter)) return false
    return true
  })

  const exportParams = new URLSearchParams({
    type: 'loan-book',
    status: statusFilter,
    loanType: typeFilter,
    ...(yearFilter !== 'all' ? { loanYear: yearFilter } : {}),
  })

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as LoanStatusFilter)}
          >
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
              <SelectItem value="defaulted">Defaulted</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as LoanTypeFilter)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Loan Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="flat_interest">Flat Interest</SelectItem>
              <SelectItem value="diminishing">Diminishing</SelectItem>
              <SelectItem value="hybrid_diminishing">Hybrid</SelectItem>
            </SelectContent>
          </Select>
          <Select value={yearFilter} onValueChange={setYearFilter}>
            <SelectTrigger className="w-28">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Years</SelectItem>
              {years.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <ExportButton href={`/api/reports/export?${exportParams.toString()}`} label="Export CSV" />
      </div>

      <p className="text-sm text-muted-foreground">
        Showing {filtered.length} of {data.length} loans
      </p>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Borrower</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Principal</TableHead>
              <TableHead className="text-right">Outstanding</TableHead>
              <TableHead className="text-right">Interest Paid</TableHead>
              <TableHead className="text-right">Penalties</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Start Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                  No loans match the selected filters.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((row) => (
                <TableRow key={row.loanId}>
                  <TableCell className="font-medium">{row.borrowerName}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {LOAN_TYPE_LABELS[row.loanType]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatPHP(row.principal)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatPHP(row.outstandingBalance)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-green-600">
                    {formatPHP(row.totalInterestPaid)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-orange-600">
                    {formatPHP(row.totalPenaltiesPaid)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={row.status} />
                  </TableCell>
                  <TableCell className="tabular-nums text-muted-foreground">
                    {formatManila(row.startDate, 'MMM d, yyyy')}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

// ─── Partner Equity Tab ───────────────────────────────────────────────────────

function PartnerEquityTab({ data }: { data: PartnerEquityRow[] }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <ExportButton href="/api/reports/export?type=partner-equity" label="Export CSV" />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {data.map((row) => (
          <Card key={row.partnerId}>
            <CardContent className="p-6 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <p className="font-semibold">{row.partnerName}</p>
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Contributed</span>
                  <span className="tabular-nums font-medium">
                    {formatPHP(row.totalContributed)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Dividends received</span>
                  <span className="tabular-nums text-red-600">
                    − {formatPHP(row.totalDividendsReceived)}
                  </span>
                </div>
                <div className="flex justify-between text-sm border-t pt-1 mt-1">
                  <span className="font-medium">Net equity</span>
                  <span className="tabular-nums font-bold">{formatPHP(row.netEquity)}</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {row.contributionMonths} months contributed
                {row.lastContribution && (
                  <> · last {formatManila(row.lastContribution, 'MMM yyyy')}</>
                )}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Detail</h2>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Partner</TableHead>
                <TableHead className="text-right">Total Contributed</TableHead>
                <TableHead className="text-right">Dividends Received</TableHead>
                <TableHead className="text-right">Net Equity</TableHead>
                <TableHead className="text-right">Months</TableHead>
                <TableHead>Last Contribution</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row) => (
                <TableRow key={row.partnerId}>
                  <TableCell className="font-medium">{row.partnerName}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatPHP(row.totalContributed)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-red-600">
                    {formatPHP(row.totalDividendsReceived)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-semibold">
                    {formatPHP(row.netEquity)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.contributionMonths}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.lastContribution ? formatManila(row.lastContribution, 'MMM d, yyyy') : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  )
}

// ─── Dividend History Tab ─────────────────────────────────────────────────────

function DividendHistoryTab({ data }: { data: DividendRow[] }) {
  const totalDistributed = data.reduce((sum, r) => sum + r.totalDistributed, 0)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Card className="flex-1 min-w-[180px]">
          <CardContent className="p-6">
            <p className="text-sm font-medium text-muted-foreground">Total Distributed</p>
            <p className="text-3xl font-bold tracking-tight">
              {formatPHPCompact(totalDistributed)}
            </p>
            <p className="text-sm text-muted-foreground">{data.length} distributions</p>
          </CardContent>
        </Card>
        <ExportButton href="/api/reports/export?type=dividends" label="Export CSV" />
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Month</TableHead>
              <TableHead className="text-right">Per Partner</TableHead>
              <TableHead className="text-right">Total Distributed</TableHead>
              <TableHead>Remarks</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                  No dividend distributions recorded.
                </TableCell>
              </TableRow>
            ) : (
              data.map((row) => (
                <TableRow key={row.distributedAt}>
                  <TableCell className="font-medium">{row.distributedAt}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatPHP(row.perPartner)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-semibold">
                    {formatPHP(row.totalDistributed)}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {row.remarks ?? '—'}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

// ─── Main ReportsClient ───────────────────────────────────────────────────────

interface ReportsClientProps {
  fundHealth: FundHealthSummary | null
  interestEarned: InterestEarnedRow[]
  loanBook: LoanBookRow[]
  partnerEquity: PartnerEquityRow[]
  dividendHistory: DividendRow[]
  availableYears: number[]
  defaultYear: number
}

export function ReportsClient({
  fundHealth,
  interestEarned,
  loanBook,
  partnerEquity,
  dividendHistory,
  availableYears,
  defaultYear,
}: ReportsClientProps) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Reports"
        subtitle="Fund health, partner equity, and loan analytics."
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="print:hidden"
          >
            <Printer className="h-4 w-4 mr-1.5" />
            Print
          </Button>
        }
      />

      <Tabs defaultValue="fund-health">
        <TabsList className="print:hidden flex-wrap h-auto gap-1">
          <TabsTrigger value="fund-health">Fund Health</TabsTrigger>
          <TabsTrigger value="interest-earned">Interest Earned</TabsTrigger>
          <TabsTrigger value="loan-book">Loan Book</TabsTrigger>
          <TabsTrigger value="partner-equity">Partner Equity</TabsTrigger>
          <TabsTrigger value="dividends">Dividends</TabsTrigger>
        </TabsList>

        <TabsContent value="fund-health" className="mt-6">
          {fundHealth ? (
            <FundHealthTab data={fundHealth} />
          ) : (
            <p className="text-sm text-muted-foreground">Fund summary data is not available.</p>
          )}
        </TabsContent>

        <TabsContent value="interest-earned" className="mt-6">
          <InterestEarnedTab
            initialData={interestEarned}
            years={availableYears}
            defaultYear={defaultYear}
          />
        </TabsContent>

        <TabsContent value="loan-book" className="mt-6">
          <LoanBookTab data={loanBook} years={availableYears} />
        </TabsContent>

        <TabsContent value="partner-equity" className="mt-6">
          <PartnerEquityTab data={partnerEquity} />
        </TabsContent>

        <TabsContent value="dividends" className="mt-6">
          <DividendHistoryTab data={dividendHistory} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
