import type { SupabaseClient } from '@supabase/supabase-js'
import { format, toZonedTime } from 'date-fns-tz'
import type {
  DividendRow,
  FundHealthSummary,
  InterestEarnedParams,
  InterestEarnedRow,
  LoanBookFilters,
  LoanBookRow,
  PartnerEquityRow,
} from '@/types'

const MANILA_TZ = 'Asia/Manila'

export async function queryFundHealth(supabase: SupabaseClient): Promise<FundHealthSummary | null> {
  const [summaryResult, countsResult] = await Promise.all([
    supabase.from('fund_summary').select('*').limit(1).single(),
    supabase
      .from('loans')
      .select('status')
      .in('status', ['active', 'overdue', 'paid', 'defaulted']),
  ])

  if (summaryResult.error) {
    console.error('queryFundHealth summary error:', summaryResult.error)
    return null
  }

  const summary = summaryResult.data as {
    total_stash: number
    total_principal_loaned: number
    total_outstanding_balance: number
    total_collected_interest: number
    total_penalties: number
    total_dividends_paid: number
    current_balance: number
  }

  if (countsResult.error) {
    console.error('queryFundHealth counts error:', countsResult.error)
  }

  const loans = (countsResult.data ?? []) as { status: string }[]
  const activeLoans = loans.filter((l) => l.status === 'active').length
  const overdueLoans = loans.filter((l) => l.status === 'overdue').length
  const paidLoans = loans.filter((l) => l.status === 'paid').length

  const roi =
    summary.total_stash > 0 ? (summary.total_collected_interest / summary.total_stash) * 100 : 0

  return {
    totalStash: summary.total_stash,
    totalPrincipalLoaned: summary.total_principal_loaned,
    totalOutstandingBalance: summary.total_outstanding_balance,
    totalInterestCollected: summary.total_collected_interest,
    totalPenaltiesCollected: summary.total_penalties,
    totalDividendsPaid: summary.total_dividends_paid,
    currentBalance: summary.current_balance,
    activeLoans,
    overdueLoans,
    paidLoans,
    roi,
  }
}

export async function queryInterestEarned(
  supabase: SupabaseClient,
  params: InterestEarnedParams
): Promise<InterestEarnedRow[]> {
  const { year, groupBy } = params

  const { data, error } = await supabase
    .from('payments')
    .select('amount_paid, paid_at, payment_type, penalty_amount, loan_id')
    .gte('paid_at', `${year}-01-01T00:00:00Z`)
    .lt('paid_at', `${year + 1}-01-01T00:00:00Z`)
    .order('paid_at', { ascending: true })

  if (error) {
    console.error('queryInterestEarned error:', error)
    return []
  }

  // Build period map with zero-filled entries
  const periodMap = new Map<string, InterestEarnedRow>()

  if (groupBy === 'month') {
    for (let m = 0; m < 12; m++) {
      const d = new Date(year, m, 1)
      const label = format(toZonedTime(d, MANILA_TZ), 'MMM yyyy', { timeZone: MANILA_TZ })
      periodMap.set(label, {
        period: label,
        interestCollected: 0,
        penaltiesCollected: 0,
        totalCollected: 0,
        loanCount: 0,
      })
    }
  } else if (groupBy === 'quarter') {
    for (let q = 1; q <= 4; q++) {
      const label = `Q${q} ${year}`
      periodMap.set(label, {
        period: label,
        interestCollected: 0,
        penaltiesCollected: 0,
        totalCollected: 0,
        loanCount: 0,
      })
    }
  } else {
    const label = `${year}`
    periodMap.set(label, {
      period: label,
      interestCollected: 0,
      penaltiesCollected: 0,
      totalCollected: 0,
      loanCount: 0,
    })
  }

  const loanSets = new Map<string, Set<string>>()

  for (const payment of data ?? []) {
    const manilaDate = toZonedTime(new Date(payment.paid_at), MANILA_TZ)
    let label: string

    if (groupBy === 'month') {
      label = format(manilaDate, 'MMM yyyy', { timeZone: MANILA_TZ })
    } else if (groupBy === 'quarter') {
      const month = manilaDate.getMonth() // 0-based
      const quarter = Math.floor(month / 3) + 1
      label = `Q${quarter} ${year}`
    } else {
      label = `${year}`
    }

    const entry = periodMap.get(label)
    if (!entry) continue

    const penalty = payment.penalty_amount ?? 0

    if (payment.payment_type === 'interest') {
      entry.interestCollected += Math.max(0, payment.amount_paid - penalty)
      entry.penaltiesCollected += penalty
      // Count loan only when it has contributed interest or penalty income
      const loanSet = loanSets.get(label) ?? new Set<string>()
      loanSet.add(payment.loan_id)
      loanSets.set(label, loanSet)
      entry.loanCount = loanSet.size
    } else if (payment.payment_type === 'penalty') {
      entry.penaltiesCollected += payment.amount_paid
      const loanSet = loanSets.get(label) ?? new Set<string>()
      loanSet.add(payment.loan_id)
      loanSets.set(label, loanSet)
      entry.loanCount = loanSet.size
    }

    entry.totalCollected = entry.interestCollected + entry.penaltiesCollected
  }

  return Array.from(periodMap.values())
}

export async function queryLoanBook(
  supabase: SupabaseClient,
  filters: LoanBookFilters
): Promise<LoanBookRow[]> {
  let query = supabase
    .from('loans')
    .select(
      `
      id,
      loan_type,
      principal,
      status,
      contract_status,
      start_date,
      end_date,
      reminders_enabled,
      borrower:borrowers(full_name),
      payments(amount_paid, payment_type, penalty_amount),
      principal_returns(amount)
    `
    )
    .order('start_date', { ascending: false })

  if (filters.status !== 'all') {
    query = query.eq('status', filters.status)
  }
  if (filters.loanType !== 'all') {
    query = query.eq('loan_type', filters.loanType)
  }
  if (filters.year !== 'all') {
    query = query
      .gte('start_date', `${filters.year}-01-01`)
      .lt('start_date', `${Number(filters.year) + 1}-01-01`)
  }

  const { data, error } = await query

  if (error) {
    console.error('queryLoanBook error:', error)
    return []
  }

  return (data ?? []).map((row) => {
    const borrower = row.borrower as unknown as { full_name: string } | null
    const payments =
      (row.payments as unknown as Array<{
        amount_paid: number
        payment_type: string
        penalty_amount: number
      }>) ?? []
    const principalReturns = (row.principal_returns as unknown as Array<{ amount: number }>) ?? []

    const totalInterestPaid = payments
      .filter((p) => p.payment_type === 'interest')
      .reduce((sum, p) => sum + Math.max(0, p.amount_paid - (p.penalty_amount ?? 0)), 0)

    const totalPenaltiesPaid = payments.reduce((sum, p) => sum + (p.penalty_amount ?? 0), 0)

    // For flat_interest loans, principal is repaid as a 'full' or 'principal' payment;
    // principal_returns only tracks hybrid_diminishing partial returns.
    let outstandingBalance: number
    if (row.loan_type === 'flat_interest') {
      const principalRepaid = payments.some(
        (p) => p.payment_type === 'full' || p.payment_type === 'principal'
      )
      outstandingBalance = principalRepaid ? 0 : row.principal
    } else {
      const totalReturned = principalReturns.reduce((sum, r) => sum + r.amount, 0)
      outstandingBalance = row.principal - totalReturned
    }

    return {
      loanId: row.id,
      borrowerName: borrower?.full_name ?? '',
      loanType: row.loan_type,
      principal: row.principal,
      outstandingBalance,
      totalInterestPaid,
      totalPenaltiesPaid,
      status: row.status,
      contractStatus: row.contract_status,
      startDate: row.start_date,
      endDate: row.end_date,
      remindersEnabled: row.reminders_enabled,
    }
  })
}

export async function queryPartnerEquity(supabase: SupabaseClient): Promise<PartnerEquityRow[]> {
  const { data, error } = await supabase
    .from('partners')
    .select(
      `
      id,
      name,
      contributions(amount, created_at),
      dividends(amount)
    `
    )
    .order('name', { ascending: true })

  if (error) {
    console.error('queryPartnerEquity error:', error)
    return []
  }

  return (data ?? []).map((row) => {
    const contributions =
      (row.contributions as unknown as Array<{
        amount: number
        created_at: string
      }>) ?? []
    const dividends = (row.dividends as unknown as Array<{ amount: number }>) ?? []

    const totalContributed = contributions.reduce((sum, c) => sum + c.amount, 0)
    const totalDividendsReceived = dividends.reduce((sum, d) => sum + d.amount, 0)

    const sorted = [...contributions].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    const lastContribution = sorted[0]?.created_at ?? null

    return {
      partnerId: row.id,
      partnerName: row.name,
      totalContributed,
      totalDividendsReceived,
      netEquity: totalContributed - totalDividendsReceived,
      contributionMonths: contributions.length,
      lastContribution,
    }
  })
}

export async function queryDividendHistory(supabase: SupabaseClient): Promise<DividendRow[]> {
  const { data, error } = await supabase
    .from('dividends')
    .select('distributed_at, amount, remarks')
    .order('distributed_at', { ascending: false })

  if (error) {
    console.error('queryDividendHistory error:', error)
    return []
  }

  // Group by distributed_at — each distribution event has 3 rows (one per partner).
  // Compute totalDistributed as the actual sum of all partner rows for that date.
  const grouped = new Map<
    string,
    { totalDistributed: number; perPartner: number; remarks: string | null; count: number }
  >()
  for (const row of data ?? []) {
    const key = row.distributed_at
    const existing = grouped.get(key)
    if (existing) {
      existing.totalDistributed += row.amount
      existing.count += 1
    } else {
      grouped.set(key, {
        totalDistributed: row.amount,
        perPartner: row.amount,
        remarks: row.remarks,
        count: 1,
      })
    }
  }

  return Array.from(grouped.entries()).map(([distributedAt, entry]) => ({
    distributedAt,
    // perPartner = totalDistributed / count (handles unequal amounts gracefully)
    perPartner: Math.round(entry.totalDistributed / entry.count),
    totalDistributed: entry.totalDistributed,
    remarks: entry.remarks,
  }))
}

export async function queryAvailableYears(supabase: SupabaseClient): Promise<number[]> {
  const { data, error } = await supabase.rpc('get_payment_years')

  if (error || !data) {
    // Fallback: derive years from payments table via JS
    const { data: payments, error: pErr } = await supabase
      .from('payments')
      .select('paid_at')
      .order('paid_at', { ascending: false })

    if (pErr || !payments?.length) {
      const currentYear = toZonedTime(new Date(), MANILA_TZ).getFullYear()
      return [currentYear]
    }

    const years = new Set<number>()
    for (const p of payments) {
      const y = toZonedTime(new Date(p.paid_at), MANILA_TZ).getFullYear()
      years.add(y)
    }
    return Array.from(years).sort((a, b) => b - a)
  }

  return (data as { year: number }[]).map((r) => r.year).sort((a, b) => b - a)
}
