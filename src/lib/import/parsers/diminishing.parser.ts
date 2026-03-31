import Papa from 'papaparse'
import { parsePHPAmount, parseSheetDate } from './utils'

export interface ParsedDiminishingPayment {
  period: number
  dueDate: string // YYYY-MM-DD
  principalDue: number // centavos
  interestDue: number // centavos
  totalDue: number // centavos
  balanceAfter: number // centavos
  paid: boolean
  paidAt: string | null // YYYY-MM-DD
}

export interface ParsedDiminishingLoan {
  borrowerName: string
  principal: number // centavos
  termMonths: number
  startDate: string // YYYY-MM-DD
  payments: ParsedDiminishingPayment[]
}

export interface ParsedDiminishingData {
  loans: ParsedDiminishingLoan[]
  errors: Array<{ row: number; message: string }>
}

interface ColumnIndices {
  periodIdx: number
  dueDateIdx: number
  totalIdx: number
  principalColIdx: number
  interestIdx: number
  balanceIdx: number
}

function detectBorrowerName(rows: string[][]): string {
  let borrowerName = 'Unknown Borrower'
  let found = false

  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const first = rows[i][0]?.trim() ?? ''
    const second = rows[i][1]?.trim() ?? ''

    if (first.toLowerCase().startsWith('borrower')) {
      borrowerName = second || first.replace(/^borrower\s*:?\s*/i, '').trim() || borrowerName
      found = true
      break
    }

    if (
      !found &&
      first &&
      !first.toLowerCase().includes('period') &&
      !first.toLowerCase().includes('due') &&
      !first.toLowerCase().includes('date') &&
      /[A-Za-z]{3,}/.test(first) &&
      !/^\d+$/.test(first)
    ) {
      const candidate = first.replace(/^(?:name|borrower)\s*:?\s*/i, '').trim()
      if (candidate.length > 2) {
        borrowerName = candidate
        found = true
      }
    }
  }

  return borrowerName
}

function findHeaderRowIndex(rows: string[][]): number {
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const row = rows[i]
    if (
      row.some((c) => c?.trim().toLowerCase().includes('period')) ||
      row.some((c) => c?.trim().toLowerCase() === 'due date' || c?.trim().toLowerCase() === 'due')
    ) {
      return i
    }
  }

  for (let i = 0; i < rows.length; i++) {
    if (rows[i].some((c) => c?.trim().toLowerCase() === 'period')) return i
  }

  return -1
}

function mapHeaderColumns(headerRow: string[]): ColumnIndices {
  const headers = headerRow.map((h) => h?.trim().toLowerCase() ?? '')
  return {
    periodIdx: headers.findIndex((h) => h.includes('period')),
    dueDateIdx: headers.findIndex((h) => h.includes('due') || h.includes('date')),
    totalIdx: headers.findIndex(
      (h) => h.includes('monthly') || h.includes('total') || h.includes('payment')
    ),
    principalColIdx: headers.findIndex((h) => h.includes('principal') && !h.includes('balance')),
    interestIdx: headers.findIndex((h) => h.includes('interest')),
    balanceIdx: headers.findLastIndex((h) => h.includes('balance')),
  }
}

function parsePaymentRows(
  rows: string[][],
  headerRowIdx: number,
  cols: ColumnIndices
): {
  payments: ParsedDiminishingPayment[]
  principal: number
  startDate: string | null
  errors: ParsedDiminishingData['errors']
} {
  const payments: ParsedDiminishingPayment[] = []
  const errors: ParsedDiminishingData['errors'] = []
  let principal = 0
  let startDate: string | null = null

  for (let i = headerRowIdx + 1; i < rows.length; i++) {
    const row = rows[i]
    const rawPeriod = row[Math.max(cols.periodIdx, 0)]?.trim() ?? ''
    const period = Number.parseInt(rawPeriod, 10)
    if (Number.isNaN(period) || period <= 0) continue

    const rawDate = cols.dueDateIdx >= 0 ? (row[cols.dueDateIdx]?.trim() ?? '') : ''
    const dueDate = parseSheetDate(rawDate)
    if (!dueDate) {
      errors.push({ row: i, message: `Could not parse due date: ${rawDate}` })
      continue
    }

    if (!startDate) startDate = dueDate

    const totalDue = cols.totalIdx >= 0 ? parsePHPAmount(row[cols.totalIdx]?.trim() ?? '') : 0
    const principalDue =
      cols.principalColIdx >= 0 ? parsePHPAmount(row[cols.principalColIdx]?.trim() ?? '') : 0
    const interestDue =
      cols.interestIdx >= 0 ? parsePHPAmount(row[cols.interestIdx]?.trim() ?? '') : 0
    const balanceAfter =
      cols.balanceIdx >= 0 ? parsePHPAmount(row[cols.balanceIdx]?.trim() ?? '') : 0

    if (period === 1 && principalDue > 0) {
      principal = balanceAfter + principalDue
    }

    payments.push({
      period,
      dueDate,
      principalDue,
      interestDue,
      totalDue: totalDue || principalDue + interestDue,
      balanceAfter,
      paid: false,
      paidAt: null,
    })
  }

  return { payments, principal, startDate, errors }
}

/**
 * Parses a raw CSV from the AHA or VZ diminishing loan tab.
 * Looks for:
 *   - A borrower name row near the top (row with label like "Borrower:" or standalone name)
 *   - A header row with "Period" or "Due Date" column labels
 *   - Data rows with period number + date + amounts
 */
export function parseDiminishingCSV(csvString: string): ParsedDiminishingData {
  const loans: ParsedDiminishingData['loans'] = []
  const errors: ParsedDiminishingData['errors'] = []

  const { data: rows } = Papa.parse<string[]>(csvString, {
    skipEmptyLines: false,
    header: false,
  })

  if (rows.length === 0) return { loans, errors }

  const borrowerName = detectBorrowerName(rows)
  const headerRowIdx = findHeaderRowIndex(rows)

  if (headerRowIdx === -1) {
    errors.push({
      row: 0,
      message: 'Could not find column header row (expected "Period", "Due Date", etc.)',
    })
    return { loans, errors }
  }

  const cols = mapHeaderColumns(rows[headerRowIdx])
  const {
    payments,
    principal,
    startDate,
    errors: rowErrors,
  } = parsePaymentRows(rows, headerRowIdx, cols)
  errors.push(...rowErrors)

  if (payments.length === 0) {
    errors.push({ row: headerRowIdx, message: 'No payment rows found after header' })
    return { loans, errors }
  }

  loans.push({
    borrowerName,
    principal: principal || payments[0].principalDue + payments[0].balanceAfter,
    termMonths: payments.length,
    startDate: startDate ?? payments[0].dueDate,
    payments,
  })

  return { loans, errors }
}
