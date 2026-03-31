import { describe, expect, it } from 'vitest'
import {
  isBorrowerNameRow,
  isPrincipalReturnRow,
  parseMonthLabel,
  parsePHPAmount,
  parsePrincipalReturnRow,
  parseSheetDate,
} from '../utils'

describe('parsePHPAmount', () => {
  it('parses peso symbol format', () => {
    expect(parsePHPAmount('₱3,000.00')).toBe(300000)
  })
  it('parses PHP prefix format', () => {
    expect(parsePHPAmount('PHP 5,000')).toBe(500000)
  })
  it('parses plain integer string', () => {
    expect(parsePHPAmount('200000')).toBe(20000000)
  })
  it('parses decimal string with commas', () => {
    expect(parsePHPAmount('3,000.00')).toBe(300000)
  })
  it('returns 0 for empty string', () => {
    expect(parsePHPAmount('')).toBe(0)
  })
  it('returns 0 for garbage string', () => {
    expect(parsePHPAmount('N/A')).toBe(0)
  })
  it('handles large amounts like 200,000', () => {
    expect(parsePHPAmount('200,000')).toBe(20000000)
  })
  it('handles amounts with only pesos symbol', () => {
    expect(parsePHPAmount('₱1,500')).toBe(150000)
  })
})

describe('parseSheetDate', () => {
  it('parses MM/DD/YY format', () => {
    expect(parseSheetDate('02/28/24')).toBe('2024-02-28')
  })
  it('parses MM/DD/YYYY format', () => {
    expect(parseSheetDate('11/08/2025')).toBe('2025-11-08')
  })
  it('parses month-year NOV format', () => {
    expect(parseSheetDate("NOV '25")).toBe('2025-11-01')
  })
  it('parses month-year MAR format', () => {
    expect(parseSheetDate("MAR '26")).toBe('2026-03-01')
  })
  it('returns null for invalid input', () => {
    expect(parseSheetDate('not-a-date')).toBeNull()
  })
  it('returns null for empty string', () => {
    expect(parseSheetDate('')).toBeNull()
  })
  it('handles single-digit month and day', () => {
    expect(parseSheetDate('1/5/24')).toBe('2024-01-05')
  })
})

describe('parseMonthLabel', () => {
  it('parses standard 3-letter month', () => {
    expect(parseMonthLabel("MAR '26")).toBe('2026-03')
  })
  it('parses SEPT abbreviation', () => {
    expect(parseMonthLabel("SEPT '25")).toBe('2025-09')
  })
  it('parses JUNE abbreviation', () => {
    expect(parseMonthLabel("JUNE '23")).toBe('2023-06')
  })
  it('parses JAN', () => {
    expect(parseMonthLabel("JAN '24")).toBe('2024-01')
  })
  it('parses DEC', () => {
    expect(parseMonthLabel("DEC '22")).toBe('2022-12')
  })
  it('parses OCT', () => {
    expect(parseMonthLabel("OCT '22")).toBe('2022-10')
  })
  it('returns null for unparseable input', () => {
    expect(parseMonthLabel('not a month')).toBeNull()
  })
  it('returns null for empty string', () => {
    expect(parseMonthLabel('')).toBeNull()
  })
})

describe('isPrincipalReturnRow', () => {
  it('matches full return pattern (no amount)', () => {
    expect(isPrincipalReturnRow('----PRINCIPAL RETURNED 02/28/24----')).toBe(true)
  })
  it('matches partial return pattern (with PHP amount)', () => {
    expect(isPrincipalReturnRow('----PRINCIPAL RETURNED PHP 5,000 11/08/25----')).toBe(true)
  })
  it('matches with more dashes', () => {
    expect(isPrincipalReturnRow('------PRINCIPAL RETURNED 03/15/25------')).toBe(true)
  })
  it('is case insensitive', () => {
    expect(isPrincipalReturnRow('----principal returned 01/01/25----')).toBe(true)
  })
  it('returns false for regular payment row', () => {
    expect(isPrincipalReturnRow("MAR '26")).toBe(false)
  })
  it('returns false for borrower name', () => {
    expect(isPrincipalReturnRow('JUAN DELA CRUZ')).toBe(false)
  })
  it('returns false for empty string', () => {
    expect(isPrincipalReturnRow('')).toBe(false)
  })
})

describe('parsePrincipalReturnRow', () => {
  it('parses full return (no amount) — amount is null', () => {
    const result = parsePrincipalReturnRow('----PRINCIPAL RETURNED 02/28/24----')
    expect(result).not.toBeNull()
    expect(result?.amount).toBeNull()
    expect(result?.date).toBe('2024-02-28')
  })
  it('parses partial return with PHP amount', () => {
    const result = parsePrincipalReturnRow('----PRINCIPAL RETURNED PHP 5,000 11/08/25----')
    expect(result).not.toBeNull()
    expect(result?.amount).toBe(500000)
    expect(result?.date).toBe('2025-11-08')
  })
  it('returns null for non-matching row', () => {
    expect(parsePrincipalReturnRow("MAR '26")).toBeNull()
  })
  it('parses large partial return amount', () => {
    const result = parsePrincipalReturnRow('----PRINCIPAL RETURNED PHP 200,000 03/01/26----')
    expect(result).not.toBeNull()
    expect(result?.amount).toBe(20000000)
  })
})

describe('isBorrowerNameRow', () => {
  it('recognises a borrower name when next row has amount', () => {
    expect(isBorrowerNameRow('JUAN DELA CRUZ', true)).toBe(true)
  })
  it('recognises ALL CAPS name', () => {
    expect(isBorrowerNameRow('MELCA YBANEZ', true)).toBe(true)
  })
  it('returns false for a month label', () => {
    expect(isBorrowerNameRow("MAR '26", true)).toBe(false)
  })
  it('returns false for a PRINCIPAL RETURNED row', () => {
    expect(isBorrowerNameRow('----PRINCIPAL RETURNED 02/28/24----', true)).toBe(false)
  })
  it('returns false for a numeric amount', () => {
    expect(isBorrowerNameRow('1500.00', true)).toBe(false)
  })
  it('returns false for empty string', () => {
    expect(isBorrowerNameRow('', true)).toBe(false)
  })
  it('returns false for whitespace-only string (line 139 branch)', () => {
    expect(isBorrowerNameRow('   ', true)).toBe(false)
  })
  it('returns false for a date string like 01/05/25 (line 142 branch)', () => {
    expect(isBorrowerNameRow('01/05/25', true)).toBe(false)
  })
  it('returns true via letter-regex when nextRowHasAmount is false (line 148 || branch)', () => {
    expect(isBorrowerNameRow('Frank Mendez', false)).toBe(true)
  })
  it('returns false when nextRowHasAmount is false and value has no letters', () => {
    expect(isBorrowerNameRow('12345', false)).toBe(false)
  })
})

describe('parsePrincipalReturnRow — invalid-date branch', () => {
  it('returns null when full-return marker contains an invalid date (line 119 branch)', () => {
    // "99/01/24" passes the regex (1–2 digit month) but fails parseSheetDate validation (month 99)
    expect(parsePrincipalReturnRow('----PRINCIPAL RETURNED 99/01/24----')).toBeNull()
  })

  it('returns null when partial-return marker contains an invalid date (line 129 branch)', () => {
    // "99/01/24" passes the PARTIAL regex but fails parseSheetDate → null
    expect(parsePrincipalReturnRow('----PRINCIPAL RETURNED PHP 5,000 99/01/24----')).toBeNull()
  })

  it('returns null when value is not a string (line 121 typeof branch)', () => {
    // TypeScript callers always pass strings, but the runtime guard must be covered
    expect(parsePrincipalReturnRow(42 as unknown as string)).toBeNull()
  })
})

describe('parseMonthLabel — additional branches', () => {
  it('returns null for a regex-matching string with an unknown month abbreviation (line 95 branch)', () => {
    // "XYZ '26" matches MONTH_YEAR_RE but "xyz" is not in MONTH_MAP → null
    expect(parseMonthLabel("XYZ '26")).toBeNull()
  })

  it('returns a 19xx year for two-digit year >= 50 (line 96 true branch)', () => {
    // year 55 >= 50 → "1955"
    expect(parseMonthLabel("JAN '55")).toBe('1955-01')
  })
})
