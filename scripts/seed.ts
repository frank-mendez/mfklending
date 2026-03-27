import 'dotenv/config'
import { seedBorrowers } from './seed/borrowers'
import { seedContributions } from './seed/contributions'
import { seedDiminishingLoans } from './seed/diminishing'
import { seedDividends } from './seed/dividends'
import { seedLoans } from './seed/loans'
import { seedPartners } from './seed/partners'

async function main() {
  console.log('🌱 Starting MFK seed...\n')

  // Step 1 — Partners (required by everything else)
  const partnerIds = await seedPartners()

  // Step 2 — Contributions (requires partnerIds)
  await seedContributions(partnerIds)

  // Step 3 — Dividends (requires partnerIds)
  await seedDividends(partnerIds)

  // Step 4 — Borrowers (CSV-dependent, safe to run without CSV)
  const borrowerIds = await seedBorrowers()

  // Step 5 — Loans (CSV-dependent, safe to run without CSV)
  await seedLoans(borrowerIds)

  // Step 6 — Diminishing loans (CSV-dependent, safe to run without CSV)
  await seedDiminishingLoans()

  console.log('\n✅ Seed complete.')
}

main().catch((err) => {
  console.error('❌ Seed failed:', err)
  process.exit(1)
})
