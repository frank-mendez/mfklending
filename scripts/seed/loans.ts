import { existsSync } from 'node:fs'
import path from 'node:path'

export async function seedLoans(_borrowerIds: Record<string, string>): Promise<void> {
  console.log('Seeding loans...')

  const lendingCsvPath = path.join(process.cwd(), 'scripts', 'data', 'lending.csv')

  if (!existsSync(lendingCsvPath)) {
    console.log('⚠ scripts/data/lending.csv not found — skipping loan seeding')
    return
  }

  console.log('ℹ lending.csv found — loan seeding not yet implemented')

  // TODO: parse lending.csv and seed loans, loan_schedules, payments
}
