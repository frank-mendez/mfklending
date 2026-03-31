import { describe, expect, it } from 'vitest'
import { parseDiminishingCSV } from '../diminishing.parser'

const SAMPLE_DIMINISHING_CSV = `Borrower: Al Huber Allere,,,,,,
Loan Amount: 500000,,,,,,
,,,,,,
Period,Due Date,Monthly Payment,Principal,Interest,Balance,Paid
1,01/31/24,27027,17527,9500,482473,
2,02/29/24,27027,17860,9167,464613,
3,03/31/24,27027,18203,8824,446410,
4,04/30/24,27027,18553,8474,427857,
5,05/31/24,27027,18912,8115,408945,`

describe('parseDiminishingCSV', () => {
  it('extracts borrower name', () => {
    const result = parseDiminishingCSV(SAMPLE_DIMINISHING_CSV)
    expect(result.loans[0].borrowerName).toContain('Al Huber Allere')
  })

  it('parses correct number of periods', () => {
    const result = parseDiminishingCSV(SAMPLE_DIMINISHING_CSV)
    expect(result.loans[0].payments).toHaveLength(5)
  })

  it('sets start date from first period', () => {
    const result = parseDiminishingCSV(SAMPLE_DIMINISHING_CSV)
    expect(result.loans[0].startDate).toBe('2024-01-31')
  })

  it('converts amounts to centavos', () => {
    const result = parseDiminishingCSV(SAMPLE_DIMINISHING_CSV)
    const p1 = result.loans[0].payments[0]
    expect(p1.principalDue).toBe(1752700) // ₱17,527
    expect(p1.interestDue).toBe(950000) // ₱9,500
    expect(p1.balanceAfter).toBe(48247300) // ₱482,473
  })

  it('returns error for CSV without header row', () => {
    const result = parseDiminishingCSV('just,some,data\nno,headers,here')
    expect(result.errors.length).toBeGreaterThan(0)
  })

  it('returns empty for empty CSV', () => {
    const result = parseDiminishingCSV('')
    expect(result.loans).toHaveLength(0)
  })

  it('records an error for a row with an unparseable due date (lines 122-124)', () => {
    const csv = `Borrower: Test Borrower,,,,,,
Period,Due Date,Monthly Payment,Principal,Interest,Balance,Paid
1,not-a-date,27027,17527,9500,482473,
2,02/29/24,27027,17860,9167,464613,`
    const result = parseDiminishingCSV(csv)
    expect(result.errors.length).toBeGreaterThan(0)
    expect(result.errors[0].message).toMatch(/not-a-date/)
    // Period 2 is still parsed despite period 1 error
    expect(result.loans[0].payments[0].period).toBe(2)
  })

  it('returns an error when header is found but no valid payment rows exist (lines 152-153)', () => {
    const csv = `Borrower: Nobody,,,,,,
Period,Due Date,Monthly Payment,Principal,Interest,Balance,Paid
not,a,number,row,at,all,
also,not,valid,,,`
    const result = parseDiminishingCSV(csv)
    expect(result.errors.length).toBeGreaterThan(0)
    expect(result.errors[0].message).toMatch(/No payment rows/)
    expect(result.loans).toHaveLength(0)
  })

  it('detects borrower name from standalone name row (else-if path, no "Borrower:" prefix)', () => {
    const csv = `Al Huber Allere,,,,,,
,,,,,,
Period,Due Date,Monthly Payment,Principal,Interest,Balance,Paid
1,01/31/24,27027,17527,9500,482473,`
    const result = parseDiminishingCSV(csv)
    expect(result.loans[0].borrowerName).toBe('Al Huber Allere')
  })

  it('uses principalDue + interestDue when totalDue column is 0 (line 142 ternary)', () => {
    // Monthly Payment column is blank/zero — totalDue should fall back to principal + interest
    const csv = `Borrower: Test,,,,,,
Period,Due Date,Monthly Payment,Principal,Interest,Balance,Paid
1,01/31/24,0,17527,9500,482473,`
    const result = parseDiminishingCSV(csv)
    const p1 = result.loans[0].payments[0]
    expect(p1.totalDue).toBe(p1.principalDue + p1.interestDue)
  })

  it('falls back to payment[0] components for principal when period 1 has no principalDue (line 135 branch)', () => {
    // principalDue = 0 on period 1 → principal stays 0 inside the if → uses fallback at line 158
    const csv = `Borrower: Test,,,,,,
Period,Due Date,Monthly Payment,Principal,Interest,Balance,Paid
1,01/31/24,27027,0,27027,482473,
2,02/29/24,27027,500,26527,481973,`
    const result = parseDiminishingCSV(csv)
    // principal derived from fallback: payments[0].principalDue(0) + payments[0].balanceAfter
    expect(result.loans[0].principal).toBe(48247300) // 482473 in centavos
  })

  it('sets startDate from first valid period when period 1 is skipped (startDate ?? fallback)', () => {
    // Period 1 has an invalid date — it is skipped; startDate is set from period 2
    const csv = `Borrower: Test,,,,,,
Period,Due Date,Monthly Payment,Principal,Interest,Balance,Paid
1,invalid-date,27027,17527,9500,482473,
2,02/29/24,27027,17860,9167,464613,`
    const result = parseDiminishingCSV(csv)
    expect(result.loans[0].startDate).toBe('2024-02-29')
  })

  it('finds header row beyond first 10 rows (lines 90-91 second scan)', () => {
    // Header is at row 12 (0-indexed), past the first-10-row scan
    const csv = [
      'Borrower: Late Header,,,,,,',
      ',,,,,,',
      ',,,,,,',
      ',,,,,,',
      ',,,,,,',
      ',,,,,,',
      ',,,,,,',
      ',,,,,,',
      ',,,,,,',
      ',,,,,,',
      ',,,,,,', // row 10 — first scan ends here
      'Period,Due Date,Monthly Payment,Principal,Interest,Balance,Paid',
      '1,01/31/24,27027,17527,9500,482473,',
    ].join('\n')
    const result = parseDiminishingCSV(csv)
    expect(result.loans).toHaveLength(1)
    expect(result.loans[0].payments).toHaveLength(1)
  })

  it('uses second column as borrower name when it is non-empty (second || ... truthy branch)', () => {
    // "Borrower:,Al Huber Allere" → first = "Borrower:", second = "Al Huber Allere" → second used
    const csv = `Borrower:,Al Huber Allere,,,,,
Period,Due Date,Monthly Payment,Principal,Interest,Balance,Paid
1,01/31/24,27027,17527,9500,482473,`
    const result = parseDiminishingCSV(csv)
    expect(result.loans[0].borrowerName).toBe('Al Huber Allere')
  })

  it('falls back to default borrower name when both second and replace() are empty', () => {
    // "Borrower:" with empty second column → replace("Borrower:") = "" → fallback "Unknown Borrower"
    const csv = `Borrower:,,,,,,,
Period,Due Date,Monthly Payment,Principal,Interest,Balance,Paid
1,01/31/24,27027,17527,9500,482473,`
    const result = parseDiminishingCSV(csv)
    expect(result.loans[0].borrowerName).toBe('Unknown Borrower')
  })

  it('skips borrower candidate that is too short (candidate.length <= 2)', () => {
    // "Name: X" → candidate = "X" (length 1) → not assigned, stays "Unknown Borrower"
    const csv = `Name: X,,,,,,
Period,Due Date,Monthly Payment,Principal,Interest,Balance,Paid
1,01/31/24,27027,17527,9500,482473,`
    const result = parseDiminishingCSV(csv)
    // candidate "X" has length 1 → not used → borrowerName stays "Unknown Borrower"
    expect(result.loans[0].borrowerName).toBe('Unknown Borrower')
  })

  it('returns 0 for principalDue/interestDue/totalDue when those columns are absent', () => {
    // Only "Period", "Due Date", "Balance" columns — totalIdx, principalColIdx, interestIdx all -1
    const csv = `Borrower: Minimal,,
Period,Due Date,Balance
1,01/31/24,482473
2,02/29/24,464613`
    const result = parseDiminishingCSV(csv)
    const p1 = result.loans[0].payments[0]
    expect(p1.principalDue).toBe(0)
    expect(p1.interestDue).toBe(0)
    // totalDue falls back to principalDue + interestDue = 0 + 0 = 0
    expect(p1.totalDue).toBe(0)
  })
})
