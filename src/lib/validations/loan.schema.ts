import { z } from 'zod'

export const CreateLoanSchema = z.object({
  borrower_id: z.uuid('Please select a borrower'),
  loan_type: z.enum(['flat_interest', 'diminishing']),
  /** In pesos (from form input) — converted to centavos in the action */
  principal_pesos: z.coerce
    .number()
    .min(1000, 'Minimum loan amount is ₱1,000')
    .max(500000, 'Maximum loan amount is ₱500,000'),
  term_months: z.coerce
    .number()
    .min(1, 'Minimum term is 1 month')
    .max(36, 'Maximum term is 36 months'),
  start_date: z.string().min(1, 'Start date is required'),
  purpose: z.string().optional(),
})

export type CreateLoanInput = z.infer<typeof CreateLoanSchema>

export const RecordPaymentSchema = z.object({
  loan_id: z.uuid(),
  schedule_id: z.uuid(),
  /** In pesos (from form input) — converted to centavos in the action */
  amount_paid_pesos: z.coerce.number().min(0.01, 'Amount must be greater than 0'),
  paid_at: z.string().min(1, 'Payment date is required'),
  payment_type: z.enum(['interest', 'principal', 'penalty', 'full']),
  remarks: z.string().optional(),
})

export type RecordPaymentInput = z.infer<typeof RecordPaymentSchema>
