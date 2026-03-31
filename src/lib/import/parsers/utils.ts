/**
 * Shared CSV parsing utilities for MFK Lending Corp imports.
 * All monetary amounts are handled in centavos (integer).
 */

/**
 * Parses any Philippine peso string to centavos (integer).
 * Handles: "₱3,000.00", "PHP 5,000", "3000", "3,000.00"
 * Returns 0 if unparseable — never throws.
 */
export function parsePHPAmount(value: string): number {
  if (!value || typeof value !== 'string') return 0
  // Strip currency symbols, commas, whitespace
  const cleaned = value
    .replace(/[₱\s,]/g, '')
    .replace(/^PHP/i, '')
    .trim()
  const num = parseFloat(cleaned)
  if (isNaN(num)) return 0
  return Math.round(num * 100)
}

/**
 * Parses date strings from the Google Sheet to YYYY-MM-DD.
 * Handles:
 *   MM/DD/YY   → "02/28/24"   → "2024-02-28"
 *   MM/DD/YYYY → "11/08/2025" → "2025-11-08"
 *   "NOV '25"  → "2025-11-01" (month-only, returns first of month)
 *   "MAR '26"  → "2026-03-01"
 * Returns null if unparseable. Never throws.
 */
export function parseSheetDate(value: string): string | null {
  if (!value || typeof value !== 'string') return null
  const trimmed = value.trim()

  // MM/DD/YY or MM/DD/YYYY
  const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/)
  if (slashMatch) {
    const month = slashMatch[1].padStart(2, '0')
    const day = slashMatch[2].padStart(2, '0')
    let year = slashMatch[3]
    if (year.length === 2) {
      year = parseInt(year) >= 50 ? `19${year}` : `20${year}`
    }
    // Basic validation
    const m = parseInt(month)
    const d = parseInt(day)
    if (m < 1 || m > 12 || d < 1 || d > 31) return null
    return `${year}-${month}-${day}`
  }

  // "NOV '25", "MAR '26", "JUNE '23"
  const monthYearMatch = trimmed.match(/^([A-Za-z]+)\s+'(\d{2})$/)
  if (monthYearMatch) {
    const parsed = parseMonthLabel(`${monthYearMatch[1]} '${monthYearMatch[2]}`)
    if (!parsed) return null
    return `${parsed}-01`
  }

  return null
}

const MONTH_MAP: Record<string, string> = {
  jan: '01',
  feb: '02',
  mar: '03',
  apr: '04',
  may: '05',
  jun: '06',
  june: '06',
  jul: '07',
  aug: '08',
  sep: '09',
  sept: '09',
  oct: '10',
  nov: '11',
  dec: '12',
}

/**
 * Parses month labels like "MAR '26", "SEPT '25", "JUNE '23" → "2026-03", "2025-09", "2023-06".
 * Returns null if unparseable.
 */
export function parseMonthLabel(value: string): string | null {
  if (!value || typeof value !== 'string') return null
  const trimmed = value.trim()
  const match = trimmed.match(/^([A-Za-z]+)\s+'(\d{2})$/)
  if (!match) return null
  const monthKey = match[1].toLowerCase()
  const yearShort = match[2]
  const monthNum = MONTH_MAP[monthKey]
  if (!monthNum) return null
  const year = parseInt(yearShort) >= 50 ? `19${yearShort}` : `20${yearShort}`
  return `${year}-${monthNum}`
}

const PRINCIPAL_RETURN_FULL = /^-+PRINCIPAL\s+RETURNED\s+(\d{1,2}\/\d{1,2}\/\d{2,4})-+$/i
const PRINCIPAL_RETURN_PARTIAL =
  /^-+PRINCIPAL\s+RETURNED\s+PHP\s+([\d,]+(?:\.\d{2})?)\s+(\d{1,2}\/\d{1,2}\/\d{2,4})-+$/i

/**
 * Returns true if the string matches either PRINCIPAL RETURNED row pattern.
 */
export function isPrincipalReturnRow(value: string): boolean {
  if (!value || typeof value !== 'string') return false
  const trimmed = value.trim()
  return PRINCIPAL_RETURN_FULL.test(trimmed) || PRINCIPAL_RETURN_PARTIAL.test(trimmed)
}

/**
 * Parses a PRINCIPAL RETURNED row.
 * Returns { amount: centavos | null, date: 'YYYY-MM-DD' } or null if no match.
 * amount is null for full returns (no PHP amount in marker).
 */
export function parsePrincipalReturnRow(
  value: string
): { amount: number | null; date: string } | null {
  if (!value || typeof value !== 'string') return null
  const trimmed = value.trim()

  // Try partial return first (has PHP amount)
  const partialMatch = trimmed.match(PRINCIPAL_RETURN_PARTIAL)
  if (partialMatch) {
    const amount = parsePHPAmount(partialMatch[1])
    const date = parseSheetDate(partialMatch[2])
    if (!date) return null
    return { amount, date }
  }

  // Try full return (no PHP amount)
  const fullMatch = trimmed.match(PRINCIPAL_RETURN_FULL)
  if (fullMatch) {
    const date = parseSheetDate(fullMatch[1])
    if (!date) return null
    return { amount: null, date }
  }

  return null
}

/**
 * Heuristic to detect a borrower name row in the Lending CSV.
 * A borrower name row is:
 *   - Not empty
 *   - Not a PRINCIPAL RETURNED row
 *   - Not parseable as a month label
 *   - Not parseable as a date
 *   - Not a numeric amount
 *   - nextRowHasAmount hint: if next row has a peso amount, this row is likely a name
 */
export function isBorrowerNameRow(value: string, nextRowHasAmount: boolean): boolean {
  if (!value || typeof value !== 'string') return false
  const trimmed = value.trim()
  if (!trimmed) return false
  if (isPrincipalReturnRow(trimmed)) return false
  if (parseMonthLabel(trimmed) !== null) return false
  if (parseSheetDate(trimmed) !== null) return false
  // Check if it looks like a number or peso amount
  const cleaned = trimmed
    .replace(/[₱\s,]/g, '')
    .replace(/^PHP/i, '')
    .trim()
  if (/^\d+(\.\d+)?$/.test(cleaned)) return false
  // It has text content that isn't a date/amount/return marker
  // Accept if next row has amount (strong signal) or if it looks like a name (has letters)
  return nextRowHasAmount || /[A-Za-z]{2,}/.test(trimmed)
}
