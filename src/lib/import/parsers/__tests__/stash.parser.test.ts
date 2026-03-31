import { describe, expect, it } from 'vitest'
import { parseStashCSV } from '../stash.parser'

// Sample CSV representing Stash tab structure
const SAMPLE_STASH_CSV = `MAIN STASH,,,,
Month,Frank,Francis,Kim,Remarks
OCT '22,2000,2000,2000,
NOV '22,2000,2000,2000,
DEC '22,2000,2000,0,Missing
JAN '23,2000,2000,2000,
FEB '23,2000,2000,2000,
SUBTOTAL,,,,
DIVIDEND DISTRIBUTED,,,,
NOV '25,10000,10000,10000,First distribution`

describe('parseStashCSV', () => {
  it('parses contribution rows for all three partners', () => {
    const result = parseStashCSV(SAMPLE_STASH_CSV)
    const frank = result.contributions.filter((c) => c.partnerName === 'Frank')
    const francis = result.contributions.filter((c) => c.partnerName === 'Francis')
    const kim = result.contributions.filter((c) => c.partnerName === 'Kim')
    expect(frank).toHaveLength(5)
    expect(francis).toHaveLength(5)
    expect(kim).toHaveLength(4) // DEC '22 was 0 for Kim — skipped
  })

  it('converts peso amounts to centavos', () => {
    const result = parseStashCSV(SAMPLE_STASH_CSV)
    const oct = result.contributions.find((c) => c.partnerName === 'Frank' && c.month === '2022-10')
    expect(oct?.amount).toBe(200000) // ₱2,000 = 200000 centavos
  })

  it('preserves remarks', () => {
    const result = parseStashCSV(SAMPLE_STASH_CSV)
    const dec = result.contributions.find((c) => c.partnerName === 'Frank' && c.month === '2022-12')
    expect(dec?.remarks).toBe('Missing')
  })

  it('skips rows with 0 amount', () => {
    const result = parseStashCSV(SAMPLE_STASH_CSV)
    const kimDec = result.contributions.find(
      (c) => c.partnerName === 'Kim' && c.month === '2022-12'
    )
    expect(kimDec).toBeUndefined()
  })

  it('stops at SUBTOTAL row', () => {
    const result = parseStashCSV(SAMPLE_STASH_CSV)
    // JAN '23 and FEB '23 come before SUBTOTAL — should be included
    expect(result.contributions.some((c) => c.month === '2023-01')).toBe(true)
  })

  it('parses dividend section', () => {
    const result = parseStashCSV(SAMPLE_STASH_CSV)
    expect(result.dividends).toHaveLength(1)
    expect(result.dividends[0].month).toBe('2025-11')
    expect(result.dividends[0].amountPerPartner).toBe(1000000) // ₱10,000
  })

  it('returns empty result for empty CSV', () => {
    const result = parseStashCSV('')
    expect(result.contributions).toHaveLength(0)
    expect(result.dividends).toHaveLength(0)
    expect(result.errors).toHaveLength(0)
  })

  it('returns error when header row not found', () => {
    const result = parseStashCSV('no,header,here\nsome,data,row')
    expect(result.errors.length).toBeGreaterThan(0)
  })

  it('skips rows with an invalid/non-month value in the month column (line 102 branch)', () => {
    const csv = `MAIN STASH,,,,
Month,Frank,Francis,Kim,Remarks
JAN '24,3000,3000,3000,
NOTES ABOUT YEAR,,,,Some note
FEB '24,3000,3000,3000,`
    const result = parseStashCSV(csv)
    // "NOTES ABOUT YEAR" is not a valid month — row must be skipped
    const monthsFound = [...new Set(result.contributions.map((c) => c.month))]
    expect(monthsFound).not.toContain(null)
    expect(monthsFound).toHaveLength(2) // only JAN '24 and FEB '24
  })

  it('produces null remarks when no Remarks column is present (line 104 ternary false)', () => {
    const csv = `MAIN STASH,,,
Month,Frank,Francis,Kim
JAN '24,3000,3000,3000`
    const result = parseStashCSV(csv)
    expect(result.contributions[0].remarks).toBeNull()
  })

  it('does not add dividend when amount is 0 (line 111 branch)', () => {
    const csv = `MAIN STASH,,,,
Month,Frank,Francis,Kim,Remarks
OCT '22,2000,2000,2000,
SUBTOTAL,,,,
DIVIDEND DISTRIBUTED,,,,
NOV '25,0,0,0,Zero payout`
    const result = parseStashCSV(csv)
    expect(result.dividends).toHaveLength(0)
  })

  it('skips partner columns with idx < 0 (line 123 branch) — Kim column absent', () => {
    // Header has Frank and Francis but not Kim → kimIdx = -1 → idx < 0 continue fires
    const csv = `MAIN STASH,,,,
Month,Frank,Francis,Remarks
JAN '24,3000,3000,
FEB '24,3000,3000,`
    const result = parseStashCSV(csv)
    const kim = result.contributions.filter((c) => c.partnerName === 'Kim')
    expect(kim).toHaveLength(0)
    const frank = result.contributions.filter((c) => c.partnerName === 'Frank')
    expect(frank).toHaveLength(2)
  })

  it('skips rows where the month column is an empty string (line 84 branch)', () => {
    const csv = `MAIN STASH,,,,
Month,Frank,Francis,Kim,Remarks
JAN '24,3000,3000,3000,
,,,,
FEB '24,3000,3000,3000,`
    const result = parseStashCSV(csv)
    const months = [...new Set(result.contributions.map((c) => c.month))]
    expect(months).toEqual(['2024-01', '2024-02'])
  })

  it('handles truncated rows where partner/remarks columns are undefined (?.trim() branches)', () => {
    // FEB '24 row has only 2 columns: month + Frank amount. Francis/Kim/Remarks are absent.
    // row[2], row[3], row[4] are undefined → optional-chaining ?. fires
    const csv = `MAIN STASH,,,,
Month,Frank,Francis,Kim,Remarks
JAN '24,3000,3000,3000,
FEB '24,3000`
    const result = parseStashCSV(csv)
    // Frank contributes for both months; Francis and Kim have nothing for FEB '24
    const frank = result.contributions.filter((c) => c.partnerName === 'Frank')
    const francisFeb = result.contributions.find(
      (c) => c.partnerName === 'Francis' && c.month === '2024-02'
    )
    expect(frank).toHaveLength(2)
    expect(francisFeb).toBeUndefined()
    // Remarks for FEB '24 (Frank's) should be null since row[remarksIdx] is undefined
    const frankFeb = result.contributions.find(
      (c) => c.partnerName === 'Frank' && c.month === '2024-02'
    )
    expect(frankFeb?.remarks).toBeNull()
  })
})
