import { z } from 'zod'

const PHILIPPINE_MOBILE_REGEX = /^(09|\+639)\d{9}$/

export const BorrowerSchema = z.object({
  full_name: z.string().min(2, 'Full name is required'),
  age: z.coerce.number().min(18, 'Must be at least 18').max(100, 'Age must be 100 or below'),
  occupation: z.string().min(2, 'Occupation is required'),
  email: z.email('Please enter a valid email address'),
  phone: z
    .string()
    .regex(PHILIPPINE_MOBILE_REGEX, 'Enter a valid Philippine mobile number (e.g. 09XX XXX XXXX)'),
  bank_name: z.string().min(1, 'Please select a bank'),
  account_name: z.string().min(2, 'Account name is required'),
  account_number: z.string().min(5, 'Account number is required'),
})

export type BorrowerInput = z.infer<typeof BorrowerSchema>
