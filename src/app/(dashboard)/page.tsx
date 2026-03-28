import { DashboardClient } from '@/components/dashboard/DashboardClient'
import { PageHeader } from '@/components/shared/PageHeader'
import { getActiveLoans, getFundSummary, getStashThisMonth } from '@/lib/data/dashboard'
import { formatManila } from '@/lib/utils/date'

export default async function DashboardPage() {
  const [summary, activeLoans, stashThisMonth] = await Promise.all([
    getFundSummary(),
    getActiveLoans(5),
    getStashThisMonth(),
  ])

  const today = formatManila(new Date(), 'MMMM d, yyyy')

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Dashboard" subtitle={today} />
      <DashboardClient
        initialSummary={summary}
        initialActiveLoans={activeLoans}
        initialStashThisMonth={stashThisMonth}
      />
    </div>
  )
}
