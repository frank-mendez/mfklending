import { describe, expect, it } from 'vitest'
import { SignInSchema } from '../auth.schema'
import { BorrowerSchema } from '../borrower.schema'
import { CreateLoanSchema, RecordPaymentSchema } from '../loan.schema'
import { ContributionSchema, DividendSchema } from '../stash.schema'

// ─── SignInSchema ──────────────────────────────────────────────────────────────
describe('SignInSchema', () => {
  it('accepts valid credentials', () => {
    const result = SignInSchema.safeParse({ email: 'user@example.com', password: 'secret123' })
    expect(result.success).toBe(true)
  })

  it('rejects invalid email', () => {
    const result = SignInSchema.safeParse({ email: 'not-an-email', password: 'secret123' })
    expect(result.success).toBe(false)
  })

  it('rejects password shorter than 6 chars', () => {
    const result = SignInSchema.safeParse({ email: 'user@example.com', password: 'abc' })
    expect(result.success).toBe(false)
  })
})

// ─── BorrowerSchema ────────────────────────────────────────────────────────────
const validBorrower = {
  full_name: 'Juan dela Cruz',
  age: '30',
  occupation: 'Engineer',
  email: 'juan@example.com',
  phone: '09171234567',
  bank_name: 'BPI',
  account_name: 'Juan dela Cruz',
  account_number: '123456789',
}

describe('BorrowerSchema', () => {
  it('accepts valid borrower data', () => {
    const result = BorrowerSchema.safeParse(validBorrower)
    expect(result.success).toBe(true)
  })

  it('accepts +639 phone format', () => {
    const result = BorrowerSchema.safeParse({ ...validBorrower, phone: '+639171234567' })
    expect(result.success).toBe(true)
  })

  it('rejects non-PH phone number', () => {
    const result = BorrowerSchema.safeParse({ ...validBorrower, phone: '12345678901' })
    expect(result.success).toBe(false)
  })

  it('rejects age below 18', () => {
    const result = BorrowerSchema.safeParse({ ...validBorrower, age: '17' })
    expect(result.success).toBe(false)
  })

  it('rejects age above 100', () => {
    const result = BorrowerSchema.safeParse({ ...validBorrower, age: '101' })
    expect(result.success).toBe(false)
  })

  it('rejects short full_name', () => {
    const result = BorrowerSchema.safeParse({ ...validBorrower, full_name: 'J' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid email', () => {
    const result = BorrowerSchema.safeParse({ ...validBorrower, email: 'bad' })
    expect(result.success).toBe(false)
  })

  it('rejects short account_number', () => {
    const result = BorrowerSchema.safeParse({ ...validBorrower, account_number: '123' })
    expect(result.success).toBe(false)
  })
})

// ─── CreateLoanSchema ──────────────────────────────────────────────────────────
const validLoan = {
  borrower_id: '123e4567-e89b-12d3-a456-426614174000',
  loan_type: 'flat_interest',
  principal_pesos: '30000',
  term_months: '3',
  start_date: '2026-01-01',
}

describe('CreateLoanSchema', () => {
  it('accepts valid loan data', () => {
    const result = CreateLoanSchema.safeParse(validLoan)
    expect(result.success).toBe(true)
  })

  it('accepts diminishing loan type', () => {
    const result = CreateLoanSchema.safeParse({ ...validLoan, loan_type: 'diminishing' })
    expect(result.success).toBe(true)
  })

  it('accepts optional purpose', () => {
    const result = CreateLoanSchema.safeParse({ ...validLoan, purpose: 'Business capital' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.purpose).toBe('Business capital')
  })

  it('rejects principal below 1000', () => {
    const result = CreateLoanSchema.safeParse({ ...validLoan, principal_pesos: '999' })
    expect(result.success).toBe(false)
  })

  it('rejects principal above 500000', () => {
    const result = CreateLoanSchema.safeParse({ ...validLoan, principal_pesos: '500001' })
    expect(result.success).toBe(false)
  })

  it('rejects term below 1', () => {
    const result = CreateLoanSchema.safeParse({ ...validLoan, term_months: '0' })
    expect(result.success).toBe(false)
  })

  it('rejects term above 36', () => {
    const result = CreateLoanSchema.safeParse({ ...validLoan, term_months: '37' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid loan_type', () => {
    const result = CreateLoanSchema.safeParse({ ...validLoan, loan_type: 'unknown' })
    expect(result.success).toBe(false)
  })

  it('rejects missing start_date', () => {
    const result = CreateLoanSchema.safeParse({ ...validLoan, start_date: '' })
    expect(result.success).toBe(false)
  })
})

// ─── RecordPaymentSchema ───────────────────────────────────────────────────────
const validPayment = {
  loan_id: '123e4567-e89b-12d3-a456-426614174000',
  schedule_id: '123e4567-e89b-12d3-a456-426614174001',
  amount_paid_pesos: '1500',
  paid_at: '2026-03-01',
  payment_type: 'interest',
}

describe('RecordPaymentSchema', () => {
  it('accepts valid payment data', () => {
    const result = RecordPaymentSchema.safeParse(validPayment)
    expect(result.success).toBe(true)
  })

  it('accepts all payment types', () => {
    for (const type of ['interest', 'principal', 'penalty', 'full']) {
      const result = RecordPaymentSchema.safeParse({ ...validPayment, payment_type: type })
      expect(result.success).toBe(true)
    }
  })

  it('rejects invalid payment_type', () => {
    const result = RecordPaymentSchema.safeParse({ ...validPayment, payment_type: 'other' })
    expect(result.success).toBe(false)
  })

  it('rejects amount <= 0', () => {
    const result = RecordPaymentSchema.safeParse({ ...validPayment, amount_paid_pesos: '0' })
    expect(result.success).toBe(false)
  })

  it('rejects missing paid_at', () => {
    const result = RecordPaymentSchema.safeParse({ ...validPayment, paid_at: '' })
    expect(result.success).toBe(false)
  })
})

// ─── ContributionSchema ────────────────────────────────────────────────────────
const validContribution = {
  partner_id: '123e4567-e89b-12d3-a456-426614174000',
  month: '2026-03',
  amount_pesos: '3000',
}

describe('ContributionSchema', () => {
  it('accepts valid contribution', () => {
    const result = ContributionSchema.safeParse(validContribution)
    expect(result.success).toBe(true)
  })

  it('accepts optional remarks', () => {
    const result = ContributionSchema.safeParse({ ...validContribution, remarks: 'catch-up' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.remarks).toBe('catch-up')
  })

  it('rejects invalid month format', () => {
    const result = ContributionSchema.safeParse({ ...validContribution, month: '2026/03' })
    expect(result.success).toBe(false)
  })

  it('rejects amount <= 0', () => {
    const result = ContributionSchema.safeParse({ ...validContribution, amount_pesos: '0' })
    expect(result.success).toBe(false)
  })
})

// ─── DividendSchema ────────────────────────────────────────────────────────────
describe('DividendSchema', () => {
  it('accepts valid dividend', () => {
    const result = DividendSchema.safeParse({ month: '2026-03', amount_each_pesos: '10000' })
    expect(result.success).toBe(true)
  })

  it('rejects invalid month format', () => {
    const result = DividendSchema.safeParse({ month: 'March 2026', amount_each_pesos: '10000' })
    expect(result.success).toBe(false)
  })

  it('rejects amount <= 0', () => {
    const result = DividendSchema.safeParse({ month: '2026-03', amount_each_pesos: '0' })
    expect(result.success).toBe(false)
  })
})
