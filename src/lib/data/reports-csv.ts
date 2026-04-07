/**
 * CSV generation utilities for reports.
 * These are plain async functions — no 'use server' directive.
 * Import from route handlers and server actions alike.
 */

import { createClient } from '@/lib/supabase/server'
import { toPesos } from '@/lib/utils/currency'
import { formatManila } from '@/lib/utils/date'
import type { InterestEarnedParams, LoanBookFilters } from '@/types'
import {
  queryDividendHistory,
  queryInterestEarned,
  queryLoanBook,
  queryPartnerEquity,
} from './reports-query'

function escapeCsv(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function buildCsv(headers: string[], rows: (string | number | boolean | null)[][]): string {
  const lines = [
    headers.map(escapeCsv).join(','),
    ...rows.map((row) => row.map(escapeCsv).join(',')),
  ]
  return lines.join('\n')
}

export async function buildInterestEarnedCSV(params: InterestEarnedParams): Promise<string> {
  const supabase = await createClient()
  const rows = await queryInterestEarned(supabase, params)

  return buildCsv(
    [
      'Period',
      'Interest Collected (PHP)',
      'Penalties Collected (PHP)',
      'Total Collected (PHP)',
      'Loan Count',
    ],
    rows.map((r) => [
      r.period,
      toPesos(r.interestCollected).toFixed(2),
      toPesos(r.penaltiesCollected).toFixed(2),
      toPesos(r.totalCollected).toFixed(2),
      r.loanCount,
    ])
  )
}

export async function buildLoanBookCSV(filters: LoanBookFilters): Promise<string> {
  const supabase = await createClient()
  const rows = await queryLoanBook(supabase, filters)

  return buildCsv(
    [
      'Borrower',
      'Loan Type',
      'Principal (PHP)',
      'Outstanding Balance (PHP)',
      'Interest Paid (PHP)',
      'Penalties Paid (PHP)',
      'Status',
      'Contract',
      'Start Date',
      'End Date',
      'Reminders',
    ],
    rows.map((r) => [
      r.borrowerName,
      r.loanType,
      toPesos(r.principal).toFixed(2),
      toPesos(r.outstandingBalance).toFixed(2),
      toPesos(r.totalInterestPaid).toFixed(2),
      toPesos(r.totalPenaltiesPaid).toFixed(2),
      r.status,
      r.contractStatus,
      r.startDate,
      r.endDate ?? '',
      r.remindersEnabled ? 'Yes' : 'No',
    ])
  )
}

export async function buildPartnerEquityCSV(): Promise<string> {
  const supabase = await createClient()
  const rows = await queryPartnerEquity(supabase)

  return buildCsv(
    [
      'Partner',
      'Total Contributed (PHP)',
      'Total Dividends (PHP)',
      'Net Equity (PHP)',
      'Months',
      'Last Contribution',
    ],
    rows.map((r) => [
      r.partnerName,
      toPesos(r.totalContributed).toFixed(2),
      toPesos(r.totalDividendsReceived).toFixed(2),
      toPesos(r.netEquity).toFixed(2),
      r.contributionMonths,
      r.lastContribution ? formatManila(r.lastContribution, 'MMM d, yyyy') : '',
    ])
  )
}

export async function buildDividendHistoryCSV(): Promise<string> {
  const supabase = await createClient()
  const rows = await queryDividendHistory(supabase)

  return buildCsv(
    ['Month', 'Per Partner (PHP)', 'Total Distributed (PHP)', 'Remarks'],
    rows.map((r) => [
      r.distributedAt,
      toPesos(r.perPartner).toFixed(2),
      toPesos(r.totalDistributed).toFixed(2),
      r.remarks ?? '',
    ])
  )
}
