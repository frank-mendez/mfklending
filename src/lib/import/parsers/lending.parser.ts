import Papa from 'papaparse'
import {
  isBorrowerNameRow,
  isPrincipalReturnRow,
  parseMonthLabel,
  parsePHPAmount,
  parsePrincipalReturnRow,
} from './utils'

export interface ParsedPayment {
  month: string // YYYY-MM
  amount: number // centavos — interest paid
  remarks: string | null
}

export interface ParsedPrincipalReturn {
  amount: number | null // centavos — null means full principal
  returnedAt: string // YYYY-MM-DD
}

export interface ParsedLoan {
  borrowerName: string
  principal: number // centavos — derived from first payment / 0.05
  loanType: 'flat_interest' | 'hybrid_diminishing'
  status: 'active' | 'paid'
  payments: ParsedPayment[]
  principalReturns: ParsedPrincipalReturn[]
  outstandingBalance: number // centavos
  startMonth: string | null // YYYY-MM — earliest payment month
  endMonth: string | null // YYYY-MM — latest payment or return month
}

export interface ParsedLendingData {
  loans: ParsedLoan[]
  errors: Array<{ row: number; message: string }>
}

/** Round a derived principal to the nearest ₱1,000 (in centavos: nearest 100,000) */
function roundToNearestThousandPesos(centavos: number): number {
  return Math.round(centavos / 100000) * 100000
}

/** Derive principal from the first interest payment: interest / rate, rounded to nearest ₱1,000 */
function derivePrincipal(firstPaymentCentavos: number, rate = 0.05): number {
  if (firstPaymentCentavos <= 0) return 0
  const rawPrincipal = firstPaymentCentavos / rate
  return roundToNearestThousandPesos(rawPrincipal)
}

/** Convert a YYYY-MM-DD date to YYYY-MM */
function dateToMonth(date: string): string {
  return date.slice(0, 7)
}

/**
 * Re-join a parsed CSV row back into a single string for pattern matching.
 * This is needed because PapaParse splits on commas inside PRINCIPAL RETURNED
 * markers (e.g. "PHP 5,000" becomes two columns). We rejoin with commas to
 * restore the original marker text before applying the regex.
 */
function rejoinRow(row: string[]): string {
  return row
    .map((c) => c?.trim() ?? '')
    .filter(Boolean)
    .join(',')
}

/** Parse all rows in a single loan block and return a ParsedLoan */
function parseLoanBlock(
  borrowerName: string,
  blockRows: string[][],
  rowOffset: number
): { loan: ParsedLoan; errors: Array<{ row: number; message: string }> } {
  const errors: Array<{ row: number; message: string }> = []
  const payments: ParsedPayment[] = []
  const principalReturns: ParsedPrincipalReturn[] = []

  for (let i = 0; i < blockRows.length; i++) {
    const row = blockRows[i]
    const cellA = row[0]?.trim() ?? ''
    const cellB = row[1]?.trim() ?? ''

    if (!cellA) continue

    // Re-join the row to handle commas inside PRINCIPAL RETURNED markers
    // (e.g. "PHP 5,000" gets split by PapaParse into separate columns)
    const rejoined = rejoinRow(row)

    if (isPrincipalReturnRow(rejoined)) {
      const parsed = parsePrincipalReturnRow(rejoined)
      if (parsed) {
        principalReturns.push({ amount: parsed.amount, returnedAt: parsed.date })
      } else {
        errors.push({
          row: rowOffset + i,
          message: `Could not parse PRINCIPAL RETURNED row: ${rejoined}`,
        })
      }
      continue
    }

    const month = parseMonthLabel(cellA)
    if (month) {
      const amount = parsePHPAmount(cellB)
      const remarks = row[2]?.trim() || null
      if (amount > 0) {
        payments.push({ month, amount, remarks })
      }
    }

    // Skip subtotal or empty rows silently
  }

  // --- Determine loan type ---
  const partialReturnCount = principalReturns.filter((r) => r.amount !== null).length
  const totalReturnCount = principalReturns.length

  let loanType: 'flat_interest' | 'hybrid_diminishing'
  if (partialReturnCount > 0 || totalReturnCount > 1) {
    loanType = 'hybrid_diminishing'
  } else {
    loanType = 'flat_interest'
  }

  // --- Derive principal ---
  const firstPayment = payments[0]?.amount ?? 0
  const principal = derivePrincipal(firstPayment)

  // --- Resolve null amounts on full returns ---
  const resolvedReturns = principalReturns.map((r) => ({
    ...r,
    amount: r.amount === null ? principal : r.amount,
  }))

  // --- Derive outstanding balance and status ---
  let outstandingBalance: number
  let status: 'active' | 'paid'

  if (loanType === 'flat_interest') {
    const hasFullReturn = principalReturns.some((r) => r.amount === null)
    const hasAnyReturn = principalReturns.length > 0
    if (
      hasFullReturn ||
      (hasAnyReturn && resolvedReturns.every((r) => (r.amount ?? 0) >= principal))
    ) {
      outstandingBalance = 0
      status = 'paid'
    } else {
      outstandingBalance = principal
      status = 'active'
    }
  } else {
    // hybrid_diminishing
    const totalReturned = resolvedReturns.reduce((sum, r) => sum + (r.amount ?? 0), 0)
    outstandingBalance = Math.max(0, principal - totalReturned)
    status = outstandingBalance === 0 ? 'paid' : 'active'
  }

  // --- Start / end months ---
  const paymentMonths = payments.map((p) => p.month).sort()
  const returnMonths = resolvedReturns.map((r) => dateToMonth(r.returnedAt)).sort()
  const allMonths = [...paymentMonths, ...returnMonths].sort()
  const startMonth = allMonths[0] ?? null
  const endMonth = allMonths[allMonths.length - 1] ?? null

  return {
    loan: {
      borrowerName,
      principal,
      loanType,
      status,
      payments,
      principalReturns: resolvedReturns,
      outstandingBalance,
      startMonth,
      endMonth,
    },
    errors,
  }
}

/**
 * Parses a raw CSV string from the Lending tab export.
 */
export function parseLendingCSV(csvString: string): ParsedLendingData {
  const loans: ParsedLoan[] = []
  const errors: Array<{ row: number; message: string }> = []

  const { data: rows } = Papa.parse<string[]>(csvString, {
    skipEmptyLines: false,
    header: false,
  })

  if (rows.length === 0) return { loans, errors }

  // Split into loan blocks by detecting borrower name rows
  let currentBorrowerName: string | null = null
  let currentBlock: string[][] = []
  let blockStartRow = 0

  const flushBlock = (atRow: number) => {
    if (currentBorrowerName && currentBlock.length > 0) {
      const { loan, errors: blockErrors } = parseLoanBlock(
        currentBorrowerName,
        currentBlock,
        blockStartRow
      )
      if (loan.principal > 0 || loan.payments.length > 0) {
        loans.push(loan)
      }
      errors.push(...blockErrors)
    }
  }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const cellA = row[0]?.trim() ?? ''
    const nextCellB = rows[i + 1]?.[1]?.trim() ?? ''
    const nextRowHasAmount = parsePHPAmount(nextCellB) > 0

    // Re-join in case a PRINCIPAL RETURNED marker was split by PapaParse
    // (commas inside "PHP 5,000" become column separators)
    const rejoined = rejoinRow(row)

    if (isPrincipalReturnRow(rejoined)) {
      // Definitely belongs to the current block — push directly
      if (currentBorrowerName !== null) {
        currentBlock.push(row)
      }
    } else if (isBorrowerNameRow(cellA, nextRowHasAmount)) {
      flushBlock(i)
      currentBorrowerName = cellA
      currentBlock = []
      blockStartRow = i + 1
    } else if (currentBorrowerName !== null) {
      currentBlock.push(row)
    }
  }

  // Flush the last block
  flushBlock(rows.length)

  return { loans, errors }
}
