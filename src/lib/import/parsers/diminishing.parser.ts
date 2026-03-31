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

  let borrowerName = 'Unknown Borrower'
  let borrowerNameFound = false
  let headerRowIdx = -1

  // Scan for borrower name and header row in first 10 rows
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const row = rows[i]
    const first = row[0]?.trim() ?? ''
    const second = row[1]?.trim() ?? ''

    // Detect "Borrower: NAME" or "BORROWER NAME" pattern
    if (first.toLowerCase().startsWith('borrower')) {
      borrowerName = second || first.replace(/^borrower\s*:?\s*/i, '').trim() || borrowerName
      borrowerNameFound = true
    } else if (
      !borrowerNameFound &&
      first &&
      !first.toLowerCase().includes('period') &&
      !first.toLowerCase().includes('due') &&
      !first.toLowerCase().includes('date') &&
      /[A-Za-z]{3,}/.test(first) &&
      !/^\d+$/.test(first)
    ) {
      // Looks like a name row if it's all text and not a column header
      const candidate = first.replace(/^(?:name|borrower)\s*:?\s*/i, '').trim()
      if (candidate.length > 2) {
        borrowerName = candidate
        borrowerNameFound = true
      }
    }

    // Detect header row by looking for "Period" or "Due Date"
    if (
      row.some((c) => c?.trim().toLowerCase().includes('period')) ||
      row.some((c) => c?.trim().toLowerCase() === 'due date' || c?.trim().toLowerCase() === 'due')
    ) {
      headerRowIdx = i
    }
  }

  if (headerRowIdx === -1) {
    // Try to find header anywhere in file
    for (let i = 0; i < rows.length; i++) {
      if (rows[i].some((c) => c?.trim().toLowerCase() === 'period')) {
        headerRowIdx = i
        break
      }
    }
  }

  if (headerRowIdx === -1) {
    errors.push({
      row: 0,
      message: 'Could not find column header row (expected "Period", "Due Date", etc.)',
    })
    return { loans, errors }
  }

  // Map header columns
  const headers = rows[headerRowIdx].map((h) => h?.trim().toLowerCase() ?? '')
  const periodIdx = headers.findIndex((h) => h.includes('period'))
  const dueDateIdx = headers.findIndex((h) => h.includes('due') || h.includes('date'))
  const totalIdx = headers.findIndex(
    (h) => h.includes('monthly') || h.includes('total') || h.includes('payment')
  )
  const principalColIdx = headers.findIndex(
    (h) => h.includes('principal') && !h.includes('balance')
  )
  const interestIdx = headers.findIndex((h) => h.includes('interest'))
  const balanceIdx = headers.findLastIndex((h) => h.includes('balance'))

  const payments: ParsedDiminishingPayment[] = []
  let principal = 0
  let startDate: string | null = null

  for (let i = headerRowIdx + 1; i < rows.length; i++) {
    const row = rows[i]
    const rawPeriod = row[periodIdx >= 0 ? periodIdx : 0]?.trim() ?? ''
    const period = parseInt(rawPeriod)
    if (isNaN(period) || period <= 0) continue

    const rawDate = dueDateIdx >= 0 ? (row[dueDateIdx]?.trim() ?? '') : ''
    const dueDate = parseSheetDate(rawDate)
    if (!dueDate) {
      errors.push({ row: i, message: `Could not parse due date: ${rawDate}` })
      continue
    }

    if (!startDate) startDate = dueDate

    const totalDue = totalIdx >= 0 ? parsePHPAmount(row[totalIdx]?.trim() ?? '') : 0
    const principalDue =
      principalColIdx >= 0 ? parsePHPAmount(row[principalColIdx]?.trim() ?? '') : 0
    const interestDue = interestIdx >= 0 ? parsePHPAmount(row[interestIdx]?.trim() ?? '') : 0
    const balanceAfter = balanceIdx >= 0 ? parsePHPAmount(row[balanceIdx]?.trim() ?? '') : 0

    // First period balance + principal = initial principal
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
      paid: false, // CSV doesn't track payment status — mark all pending
      paidAt: null,
    })
  }

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
