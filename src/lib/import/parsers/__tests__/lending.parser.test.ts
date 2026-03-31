import { describe, expect, it } from 'vitest'
import { parseLendingCSV } from '../lending.parser'

// ── Test CSV fixtures ──────────────────────────────────────────────────────────

// Flat loan, fully paid (one PRINCIPAL RETURNED, no amount)
const FLAT_PAID_CSV = `JUAN DELA CRUZ,,
OCT '24,1500,
NOV '24,1500,
DEC '24,1500,
----PRINCIPAL RETURNED 01/05/25----,,`

// Flat loan, still active (no PRINCIPAL RETURNED row)
const FLAT_ACTIVE_CSV = `MARIA SANTOS,,
JAN '26,2000,
FEB '26,2000,
MAR '26,2000,`

// Hybrid diminishing — 3 partial returns, still active
const HYBRID_ACTIVE_CSV = `GESAN REYES,,
JAN '25,10000,
FEB '25,9750,
MAR '25,9500,
----PRINCIPAL RETURNED PHP 5,000 02/15/25----,,
----PRINCIPAL RETURNED PHP 5,000 03/01/25----,,
----PRINCIPAL RETURNED PHP 5,000 03/20/25----,,`

// Hybrid diminishing — returns sum to full principal (paid)
const HYBRID_PAID_CSV = `PEDRO GARCIA,,
JAN '25,10000,
FEB '25,9750,
----PRINCIPAL RETURNED PHP 100,000 01/31/25----,,
----PRINCIPAL RETURNED PHP 100,000 02/28/25----,,`

// Multiple loans in one CSV
const MULTI_LOAN_CSV = `FIRST BORROWER,,
JAN '26,1500,
----PRINCIPAL RETURNED 02/01/26----,,
SECOND BORROWER,,
MAR '26,3000,`

// Flat loan where PRINCIPAL RETURNED has amount equal to full principal
const FLAT_AMOUNT_EQUALS_PRINCIPAL_CSV = `RICO LUNA,,
JAN '26,2500,
----PRINCIPAL RETURNED PHP 50,000 02/05/26----,,`

describe('parseLendingCSV', () => {
  describe('flat_interest paid loan', () => {
    it('classifies as flat_interest', () => {
      const result = parseLendingCSV(FLAT_PAID_CSV)
      expect(result.loans[0].loanType).toBe('flat_interest')
    })
    it('sets status to paid', () => {
      const result = parseLendingCSV(FLAT_PAID_CSV)
      expect(result.loans[0].status).toBe('paid')
    })
    it('sets outstandingBalance to 0', () => {
      const result = parseLendingCSV(FLAT_PAID_CSV)
      expect(result.loans[0].outstandingBalance).toBe(0)
    })
    it('derives principal from first payment: 1500 centavos? No — 150000/0.05=3000000', () => {
      // ₱1,500 payment × (1/0.05) = ₱30,000 principal
      const result = parseLendingCSV(FLAT_PAID_CSV)
      expect(result.loans[0].principal).toBe(3000000) // ₱30,000 in centavos
    })
    it('records 3 payments', () => {
      const result = parseLendingCSV(FLAT_PAID_CSV)
      expect(result.loans[0].payments).toHaveLength(3)
    })
  })

  describe('hybrid_diminishing — single PRINCIPAL RETURNED PHP row (amount explicit)', () => {
    it('classifies as hybrid_diminishing when PRINCIPAL RETURNED has PHP amount', () => {
      const result = parseLendingCSV(FLAT_AMOUNT_EQUALS_PRINCIPAL_CSV)
      expect(result.loans[0].loanType).toBe('hybrid_diminishing')
    })
  })

  describe('flat_interest active loan', () => {
    it('classifies as flat_interest', () => {
      const result = parseLendingCSV(FLAT_ACTIVE_CSV)
      expect(result.loans[0].loanType).toBe('flat_interest')
    })
    it('sets status to active', () => {
      const result = parseLendingCSV(FLAT_ACTIVE_CSV)
      expect(result.loans[0].status).toBe('active')
    })
    it('sets outstandingBalance to full principal', () => {
      const result = parseLendingCSV(FLAT_ACTIVE_CSV)
      // ₱2,000 × (1/0.05) = ₱40,000 = 4,000,000 centavos
      expect(result.loans[0].outstandingBalance).toBe(result.loans[0].principal)
    })
  })

  describe('hybrid_diminishing active loan', () => {
    it('classifies as hybrid_diminishing', () => {
      const result = parseLendingCSV(HYBRID_ACTIVE_CSV)
      expect(result.loans[0].loanType).toBe('hybrid_diminishing')
    })
    it('sets status to active (returns do not cover full principal)', () => {
      const result = parseLendingCSV(HYBRID_ACTIVE_CSV)
      expect(result.loans[0].status).toBe('active')
    })
    it('records 3 principal returns', () => {
      const result = parseLendingCSV(HYBRID_ACTIVE_CSV)
      expect(result.loans[0].principalReturns).toHaveLength(3)
    })
    it('computes outstanding balance correctly', () => {
      const result = parseLendingCSV(HYBRID_ACTIVE_CSV)
      // principal = ₱200,000 (10,000 / 0.05 = 200,000)
      // returned = 3 × ₱5,000 = ₱15,000
      // outstanding = ₱200,000 - ₱15,000 = ₱185,000 = 18,500,000 centavos
      const loan = result.loans[0]
      expect(loan.outstandingBalance).toBe(loan.principal - 3 * 500000)
    })
  })

  describe('hybrid_diminishing fully paid', () => {
    it('sets status to paid when returns cover full principal', () => {
      const result = parseLendingCSV(HYBRID_PAID_CSV)
      expect(result.loans[0].status).toBe('paid')
    })
    it('sets outstandingBalance to 0', () => {
      const result = parseLendingCSV(HYBRID_PAID_CSV)
      expect(result.loans[0].outstandingBalance).toBe(0)
    })
  })

  describe('multiple loans in one CSV', () => {
    it('parses both loans', () => {
      const result = parseLendingCSV(MULTI_LOAN_CSV)
      expect(result.loans).toHaveLength(2)
    })
    it('assigns correct borrower names', () => {
      const result = parseLendingCSV(MULTI_LOAN_CSV)
      expect(result.loans[0].borrowerName).toBe('FIRST BORROWER')
      expect(result.loans[1].borrowerName).toBe('SECOND BORROWER')
    })
    it('first loan is paid (has full PRINCIPAL RETURNED)', () => {
      const result = parseLendingCSV(MULTI_LOAN_CSV)
      expect(result.loans[0].status).toBe('paid')
    })
  })

  describe('startMonth and endMonth', () => {
    it('sets startMonth to earliest payment month', () => {
      const result = parseLendingCSV(FLAT_PAID_CSV)
      expect(result.loans[0].startMonth).toBe('2024-10')
    })
    it('sets endMonth from last return date', () => {
      const result = parseLendingCSV(FLAT_PAID_CSV)
      // PRINCIPAL RETURNED 01/05/25 → month 2025-01
      expect(result.loans[0].endMonth).toBe('2025-01')
    })
  })

  describe('edge cases', () => {
    it('returns empty loans for empty CSV (rows.length === 0 branch)', () => {
      const result = parseLendingCSV('')
      expect(result.loans).toHaveLength(0)
      expect(result.errors).toHaveLength(0)
    })

    it('ignores PRINCIPAL RETURNED row that appears before any borrower name', () => {
      // currentBorrowerName === null → the row must be silently ignored
      const csv = `----PRINCIPAL RETURNED 01/05/25----,,
JUAN DELA CRUZ,,
JAN '26,1500,`
      const result = parseLendingCSV(csv)
      expect(result.loans).toHaveLength(1)
      expect(result.loans[0].borrowerName).toBe('JUAN DELA CRUZ')
    })

    it('ignores non-name, non-return data rows before the first borrower name (line 227 else-if false)', () => {
      // "JAN '26" is a month row but currentBorrowerName is still null → else-if false
      const csv = `JAN '26,1500,
JUAN DELA CRUZ,,
FEB '26,1500,`
      const result = parseLendingCSV(csv)
      expect(result.loans).toHaveLength(1)
      expect(result.loans[0].payments).toHaveLength(1) // only FEB '26
    })

    it('skips a block whose rows all have empty cellA (covers derivePrincipal(0) and null startMonth/endMonth)', () => {
      // EMPTY BORROWER block has one empty row → parseLoanBlock called → no payments
      // → principal = 0, startMonth = null, endMonth = null → loan filtered out
      const csv = `EMPTY BORROWER,,
,,
REAL BORROWER,,
JAN '26,2000,`
      const result = parseLendingCSV(csv)
      expect(result.loans).toHaveLength(1)
      expect(result.loans[0].borrowerName).toBe('REAL BORROWER')
    })

    it('records an error when PRINCIPAL RETURNED marker has an invalid date (line 91 branch)', () => {
      // Month 99 passes the regex \d{1,2} but fails parseSheetDate validation
      const csv = `SOME BORROWER,,
JAN '26,1000,
----PRINCIPAL RETURNED 99/01/26----,,`
      const result = parseLendingCSV(csv)
      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.errors[0].message).toMatch(/PRINCIPAL RETURNED/)
    })

    it('pushes loan via payments.length branch when principal rounds to 0 (false || true)', () => {
      // 1 centavo payment → derivePrincipal(1) rounds to 0, but payments.length = 1
      // so the `principal > 0 || payments.length > 0` condition stays true via right side
      const csv = `TINY BORROWER,,
JAN '26,0.01,`
      const result = parseLendingCSV(csv)
      expect(result.loans).toHaveLength(1)
      expect(result.loans[0].principal).toBe(0)
      expect(result.loans[0].payments).toHaveLength(1)
    })

    it('does not push a payment when the amount is 0 (if amount > 0 false branch)', () => {
      // JAN '26 has amount 0 — skipped; only FEB '26 with non-zero is recorded
      const csv = `BORR X,,
JAN '26,0,
FEB '26,2000,`
      const result = parseLendingCSV(csv)
      expect(result.loans[0].payments).toHaveLength(1)
      expect(result.loans[0].payments[0].month).toBe('2026-02')
    })

    it('silently skips a non-month row with a date-style cellA inside a loan block (if(month) false branch)', () => {
      // "01/05/25" is parsed by parseSheetDate (not null) → isBorrowerNameRow returns false
      // → row lands in the block; parseMonthLabel("01/05/25") = null → if(month) false → skipped
      const csv = `JUAN DELA CRUZ,,
JAN '26,1500,
01/05/25,,
FEB '26,1500,`
      const result = parseLendingCSV(csv)
      expect(result.loans[0].payments).toHaveLength(2)
      expect(result.errors).toHaveLength(0)
    })

    it('treats a single-column month row as zero-amount (row[1] undefined → cellB = "", line 110)', () => {
      // PapaParse parses "JAN '26" (no comma) as a one-element array; row[1] is undefined
      // row[1]?.trim() → undefined, ?? '' → '', parsePHPAmount('') = 0 → payment skipped
      const csv = `SINGLE COL BORROWER,,
JAN '26
FEB '26,2000,`
      const result = parseLendingCSV(csv)
      // JAN '26 has no amount → not pushed; FEB '26 is the only payment
      expect(result.loans[0].payments).toHaveLength(1)
      expect(result.loans[0].payments[0].month).toBe('2026-02')
    })
  })
})
