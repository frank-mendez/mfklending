import Papa from 'papaparse'
import { parseMonthLabel, parsePHPAmount } from './utils'

export interface ParsedContribution {
  partnerName: string // 'Frank' | 'Francis' | 'Kim'
  month: string // YYYY-MM
  amount: number // centavos
  remarks: string | null
}

export interface ParsedStashData {
  contributions: ParsedContribution[]
  dividends: Array<{
    month: string // YYYY-MM
    amountPerPartner: number // centavos
  }>
  errors: Array<{ row: number; message: string }>
}

/** Detect partner columns from the header row */
function detectPartnerColumns(headers: string[]): {
  frankIdx: number
  francisIdx: number
  kimIdx: number
  remarksIdx: number
} {
  const find = (name: string) =>
    headers.findIndex((h) => h?.trim().toLowerCase() === name.toLowerCase())

  return {
    frankIdx: find('Frank'),
    francisIdx: find('Francis'),
    kimIdx: find('Kim'),
    remarksIdx: find('Remarks'),
  }
}

function isSkippableRow(rawMonth: string): boolean {
  const lower = rawMonth.toLowerCase()
  return lower.includes('subtotal') || lower.includes('grand total') || lower.includes('total')
}

function collectDividend(
  row: string[],
  month: string,
  frankIdx: number,
  dividends: ParsedStashData['dividends']
): void {
  const amountCell = frankIdx >= 0 ? row[frankIdx] : row[1]
  const amount = parsePHPAmount(amountCell?.trim() ?? '')
  if (amount > 0) {
    dividends.push({ month, amountPerPartner: amount })
  }
}

function collectContributions(
  row: string[],
  month: string,
  remarks: string | null,
  frankIdx: number,
  francisIdx: number,
  kimIdx: number,
  contributions: ParsedContribution[]
): void {
  const partners: Array<{ name: string; idx: number }> = [
    { name: 'Frank', idx: frankIdx },
    { name: 'Francis', idx: francisIdx },
    { name: 'Kim', idx: kimIdx },
  ]

  for (const { name, idx } of partners) {
    if (idx < 0) continue
    const amount = parsePHPAmount(row[idx]?.trim() ?? '')
    if (amount > 0) {
      contributions.push({ partnerName: name, month, amount, remarks })
    }
  }
}

/**
 * Parses a raw CSV string from the Stash tab export.
 * Returns contributions and dividends.
 */
export function parseStashCSV(csvString: string): ParsedStashData {
  const contributions: ParsedContribution[] = []
  const dividends: ParsedStashData['dividends'] = []
  const errors: Array<{ row: number; message: string }> = []

  const { data: rows } = Papa.parse<string[]>(csvString, {
    skipEmptyLines: false,
    header: false,
  })

  if (rows.length === 0) {
    return { contributions, dividends, errors }
  }

  // Find the header row (contains Frank, Francis, Kim)
  let headerRowIdx = -1
  for (let i = 0; i < Math.min(rows.length, 5); i++) {
    const row = rows[i]
    if (
      row.some((cell) => cell?.trim().toLowerCase() === 'frank') &&
      row.some((cell) => cell?.trim().toLowerCase() === 'francis')
    ) {
      headerRowIdx = i
      break
    }
  }

  if (headerRowIdx === -1) {
    errors.push({ row: 0, message: 'Could not find header row with partner names' })
    return { contributions, dividends, errors }
  }

  const headers = rows[headerRowIdx].map((h) => h?.trim() ?? '')
  const { frankIdx, francisIdx, kimIdx, remarksIdx } = detectPartnerColumns(headers)

  let inDividendSection = false

  for (let i = headerRowIdx + 1; i < rows.length; i++) {
    const row = rows[i]
    const rawMonth = row[0]?.trim() ?? ''

    if (!rawMonth) continue

    if (rawMonth.toLowerCase().includes('dividend')) {
      inDividendSection = true
      continue
    }

    if (isSkippableRow(rawMonth)) continue

    const month = parseMonthLabel(rawMonth)
    if (!month) continue

    const remarks = remarksIdx >= 0 ? row[remarksIdx]?.trim() || null : null

    if (inDividendSection) {
      collectDividend(row, month, frankIdx, dividends)
    } else {
      collectContributions(row, month, remarks, frankIdx, francisIdx, kimIdx, contributions)
    }
  }

  return { contributions, dividends, errors }
}
