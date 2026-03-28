import { z } from 'zod'

export const SignInSchema = z.object({
  email: z.email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

export type SignInInput = z.infer<typeof SignInSchema>
