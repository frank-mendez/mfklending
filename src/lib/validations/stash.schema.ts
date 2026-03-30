import { z } from 'zod'

export const ContributionSchema = z.object({
  partner_id: z.uuid('Please select a partner'),
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Month must be in YYYY-MM format'),
  /** In pesos (from form input) */
  amount_pesos: z.coerce.number().min(1, 'Amount must be greater than 0'),
  remarks: z.string().optional(),
})

export type ContributionInput = z.infer<typeof ContributionSchema>

export const DividendSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Month must be in YYYY-MM format'),
  /** In pesos — same amount distributed to all 3 partners */
  amount_each_pesos: z.coerce.number().min(1, 'Amount must be greater than 0'),
  remarks: z.string().optional(),
})

export type DividendInput = z.infer<typeof DividendSchema>
