import { describe, expect, it } from 'vitest'
import type { LoanFull } from '@/types'
import { formatContractData } from '../generator'

// ₱30,000 flat interest loan at 5% for 3 months
const mockLoan: LoanFull = {
  id: 'loan-test-uuid',
  borrower_id: 'borrower-uuid',
  loan_type: 'flat_interest',
  principal: 3_000_000, // ₱30,000 in centavos
  interest_rate: 0.05,
  term_months: 3,
  start_date: '2026-03-25',
  end_date: '2026-06-25',
  disbursed_at: null,
  status: 'active',
  signwell_document_id: null,
  contract_url: null,
  reminders_enabled: true,
  contract_status: 'none',
  contract_sent_at: null,
  contract_signed_at: null,
  contract_signed_pdf_path: null,
  purpose: null,
  imported_at: null,
  import_source: null,
  created_at: '2026-03-25T00:00:00Z',
  updated_at: '2026-03-25T00:00:00Z',
  borrower: {
    id: 'borrower-uuid',
    full_name: 'Melca Ybañez',
    age: 35,
    occupation: 'Teacher',
    email: 'melca@example.com',
    phone: '09171234567',
    bank_name: 'BPI',
    account_name: 'Melca Ybañez',
    account_number: '1234567890',
    created_at: '2026-01-01T00:00:00Z',
  },
  loan_schedules: [],
  payments: [],
}

describe('formatContractData', () => {
  it('returns correct ContractData shape for a flat_interest loan', () => {
    const result = formatContractData(mockLoan)

    expect(result.loanId).toBe('loan-test-uuid')
    expect(result.borrowerFullName).toBe('Melca Ybañez')
    expect(result.borrowerEmail).toBe('melca@example.com')
    expect(result.principalCentavos).toBe(3_000_000)
    expect(result.interestRate).toBe(0.05)
    expect(result.termMonths).toBe(3)
  })

  it('computes monthlyInterestCentavos = principal × rate', () => {
    const result = formatContractData(mockLoan)
    // ₱30,000 × 5% = ₱1,500 = 150,000 centavos
    expect(result.monthlyInterestCentavos).toBe(150_000)
  })

  it('computes totalRepaymentCentavos = principal + (monthlyInterest × termMonths)', () => {
    const result = formatContractData(mockLoan)
    // ₱30,000 + (₱1,500 × 3) = ₱34,500 = 3,450,000 centavos
    expect(result.totalRepaymentCentavos).toBe(3_450_000)
  })

  it('uses MFK static GoTyme account details', () => {
    const result = formatContractData(mockLoan)
    expect(result.mfkBankName).toBe('GoTyme Bank')
    expect(result.mfkAccountName).toBe('MFK Lending Corp')
    expect(result.mfkAccountNumber).toBe('014721202843')
  })

  it('formats documentDate as "MMMM d, yyyy"', () => {
    const result = formatContractData(mockLoan)
    // e.g. "April 1, 2026" — just validate format pattern
    expect(result.documentDate).toMatch(/^[A-Z][a-z]+ \d{1,2}, \d{4}$/)
  })

  it('returns null loanPurpose when purpose field not set', () => {
    const result = formatContractData(mockLoan)
    expect(result.loanPurpose).toBeNull()
  })

  it('uses outstandingBalanceCentavos override for hybrid_diminishing loans', () => {
    const hybridLoan: LoanFull = {
      ...mockLoan,
      loan_type: 'hybrid_diminishing',
      principal: 20_000_000, // ₱200,000 original
    }
    const outstandingBalance = 19_500_000 // ₱195,000 after partial return
    const result = formatContractData(hybridLoan, outstandingBalance)

    expect(result.principalCentavos).toBe(19_500_000)
    expect(result.monthlyInterestCentavos).toBe(975_000) // ₱195,000 × 5% = ₱9,750 = 975,000 centavos
  })

  it('falls back to loan.principal for hybrid_diminishing when no override provided', () => {
    const hybridLoan: LoanFull = {
      ...mockLoan,
      loan_type: 'hybrid_diminishing',
    }
    const result = formatContractData(hybridLoan)
    expect(result.principalCentavos).toBe(3_000_000)
  })
})
