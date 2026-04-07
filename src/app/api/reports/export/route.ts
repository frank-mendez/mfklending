import { type NextRequest, NextResponse } from 'next/server'
import {
  buildDividendHistoryCSV,
  buildInterestEarnedCSV,
  buildLoanBookCSV,
  buildPartnerEquityCSV,
} from '@/lib/data/reports-csv'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type')
  const yearParam = searchParams.get('year')
  const year = yearParam ? parseInt(yearParam) : new Date().getFullYear()
  const groupBy = (searchParams.get('groupBy') ?? 'month') as 'month' | 'quarter' | 'year'

  let csv = ''
  let filename = ''

  switch (type) {
    case 'interest-earned':
      csv = await buildInterestEarnedCSV({ year, groupBy })
      filename = `mfk-interest-earned-${year}.csv`
      break
    case 'loan-book': {
      const status = (searchParams.get('status') ?? 'all') as
        | 'all'
        | 'active'
        | 'paid'
        | 'overdue'
        | 'defaulted'
      const loanType = (searchParams.get('loanType') ?? 'all') as
        | 'all'
        | 'flat_interest'
        | 'diminishing'
        | 'hybrid_diminishing'
      const loanYear = searchParams.get('loanYear')
      csv = await buildLoanBookCSV({
        status,
        loanType,
        year: loanYear ? parseInt(loanYear) : 'all',
      })
      filename = `mfk-loan-book-${Date.now()}.csv`
      break
    }
    case 'partner-equity':
      csv = await buildPartnerEquityCSV()
      filename = `mfk-partner-equity-${Date.now()}.csv`
      break
    case 'dividends':
      csv = await buildDividendHistoryCSV()
      filename = `mfk-dividends-${Date.now()}.csv`
      break
    default:
      return NextResponse.json({ error: 'Invalid report type' }, { status: 400 })
  }

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
