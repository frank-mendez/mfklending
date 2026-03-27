import { existsSync } from 'node:fs'
import path from 'node:path'

export async function seedDiminishingLoans(): Promise<void> {
  console.log('Seeding diminishing loans...')

  const ahaCsvPath = path.join(process.cwd(), 'scripts', 'data', 'aha-diminishing.csv')
  const vzCsvPath = path.join(process.cwd(), 'scripts', 'data', 'vz-diminishing.csv')

  const ahaExists = existsSync(ahaCsvPath)
  const vzExists = existsSync(vzCsvPath)

  if (!ahaExists) {
    console.log('⚠ scripts/data/aha-diminishing.csv not found')
  }

  if (!vzExists) {
    console.log('⚠ scripts/data/vz-diminishing.csv not found')
  }

  if (!ahaExists && !vzExists) {
    return
  }

  if (ahaExists) {
    console.log('ℹ aha-diminishing.csv found — diminishing loan seeding not yet implemented')
  }

  if (vzExists) {
    console.log('ℹ vz-diminishing.csv found — diminishing loan seeding not yet implemented')
  }

  // TODO: parse aha-diminishing.csv and vz-diminishing.csv, seed diminishing loans
}
