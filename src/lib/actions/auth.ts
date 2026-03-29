'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { SignInSchema } from '@/lib/validations/auth.schema'
import type { ActionState } from './index'
import { actionError } from './index'

export async function signIn(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const raw = {
    email: formData.get('email'),
    password: formData.get('password'),
  }

  const result = SignInSchema.safeParse(raw)
  if (!result.success) {
    const errors = z.flattenError(result.error).fieldErrors as Record<string, string[]>
    return actionError('Please fix the errors below.', errors)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: result.data.email,
    password: result.data.password,
  })

  if (error) {
    return actionError('Invalid email or password.')
  }

  redirect('/')
}

export async function signOut(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
