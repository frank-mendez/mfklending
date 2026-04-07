import { toZonedTime } from 'date-fns-tz'
import { ReportsClient } from '@/components/reports/ReportsClient'
import {
  getAvailableYears,
  getDividendHistory,
  getFundHealth,
  getInterestEarned,
  getLoanBook,
  getPartnerEquity,
} from '@/lib/data/reports.server'

export default async function ReportsPage() {
  const currentYear = toZonedTime(new Date(), 'Asia/Manila').getFullYear()

  const [fundHealth, interestEarned, loanBook, partnerEquity, dividendHistory, availableYears] =
    await Promise.all([
      getFundHealth(),
      getInterestEarned({ year: currentYear, groupBy: 'month' }),
      getLoanBook({ status: 'all', loanType: 'all', year: 'all' }),
      getPartnerEquity(),
      getDividendHistory(),
      getAvailableYears(),
    ])

  const years = availableYears.length > 0 ? availableYears : [currentYear]

  return (
    <ReportsClient
      fundHealth={fundHealth}
      interestEarned={interestEarned}
      loanBook={loanBook}
      partnerEquity={partnerEquity}
      dividendHistory={dividendHistory}
      availableYears={years}
      defaultYear={currentYear}
    />
  )
}
