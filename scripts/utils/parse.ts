import { readFileSync } from 'node:fs'
import { parse as parseCSVLib } from 'csv-parse/sync'

/**
 * Parse Philippine Peso string to integer centavos
 * @param value - PHP string like "₱3,000.00" or "₱111,000.00"
 * @returns integer centavos (e.g., 300000 for ₱3,000.00), or 0 if unparseable
 */
export function parsePHP(value: string): number {
  // Handle empty, null, undefined
  if (!value || typeof value !== 'string') {
    return 0
  }

  // Strip whitespace
  const trimmed = value.trim()
  if (trimmed === '') {
    return 0
  }

  // Remove ₱ symbol and commas
  const cleaned = trimmed.replace(/₱/g, '').replace(/,/g, '')

  // Parse as float
  const num = parseFloat(cleaned)

  // Return 0 if NaN
  if (Number.isNaN(num)) {
    return 0
  }

  // Convert to centavos and round
  return Math.round(num * 100)
}

/**
 * Parse month string to ISO YYYY-MM format
 * @param value - month string like "MAR '26", "SEPT '23", "JUNE '25", "OCT '22"
 * @returns ISO format string (e.g., "2026-03", "2023-09")
 * @throws descriptive error if unparseable
 */
export function parseMonth(value: string): string {
  const trimmed = value.trim().toUpperCase()

  // Month abbreviation to number mapping
  const monthMap: Record<string, number> = {
    JAN: 1,
    FEB: 2,
    MAR: 3,
    APR: 4,
    MAY: 5,
    JUN: 6,
    JUNE: 6,
    JUL: 7,
    AUG: 8,
    SEPT: 9,
    SEP: 9,
    OCT: 10,
    NOV: 11,
    DEC: 12,
  }

  // Parse pattern: "MONTH 'YY" or "MONTH'YY" or "MONTH YY"
  const match = trimmed.match(/^([A-Z]+)\s*'?(\d{2})$/)

  if (!match) {
    throw new Error(
      `Unable to parse month string: "${value}". Expected format: "JAN '26" or "JUNE '25"`
    )
  }

  const monthStr = match[1]
  const yearStr = match[2]

  if (!(monthStr in monthMap)) {
    throw new Error(
      `Unknown month abbreviation: "${monthStr}" in "${value}". Valid months: JAN, FEB, MAR, APR, MAY, JUN, JUNE, JUL, AUG, SEPT, SEP, OCT, NOV, DEC`
    )
  }

  const monthNum = monthMap[monthStr]
  const year = 2000 + parseInt(yearStr, 10)

  // Format as YYYY-MM (zero-padded month)
  return `${year}-${String(monthNum).padStart(2, '0')}`
}

/**
 * Parse CSV file using csv-parse
 * @param filePath - absolute path to CSV file
 * @returns array of row objects keyed by column header
 */
export function parseCSV(filePath: string): Record<string, string>[] {
  const fileContent = readFileSync(filePath, 'utf-8')

  const rows = parseCSVLib(fileContent, {
    columns: true,
    skip_empty_lines: true,
  }) as Record<string, string>[]

  // Trim all string values in each row
  return rows.map((row) => {
    const trimmedRow: Record<string, string> = {}
    for (const [key, val] of Object.entries(row)) {
      trimmedRow[key] = typeof val === 'string' ? val.trim() : val
    }
    return trimmedRow
  })
}
