import { StashClient } from '@/components/stash/StashClient'
import {
  getContributions,
  getDividends,
  getPartners,
  getStashSummary,
} from '@/lib/data/stash.server'

export default async function StashPage() {
  const [contributions, dividends, summary, partners] = await Promise.all([
    getContributions(),
    getDividends(),
    getStashSummary(),
    getPartners(),
  ])

  return (
    <StashClient
      initialContributions={contributions}
      initialDividends={dividends}
      initialSummary={summary}
      initialPartners={partners}
    />
  )
}
