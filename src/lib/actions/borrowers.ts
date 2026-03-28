'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { type ActionState, actionError, actionSuccess } from '@/lib/actions'
import { withSentry } from '@/lib/actions/with-sentry'
import { createClient } from '@/lib/supabase/server'
import { BorrowerSchema } from '@/lib/validations/borrower.schema'

async function _createBorrower(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const raw = Object.fromEntries(formData)
  const result = BorrowerSchema.safeParse(raw)

  if (!result.success) {
    return actionError('Please fix the errors below.', z.flattenError(result.error).fieldErrors)
  }

  const supabase = await createClient()
  const { data: borrower, error } = await supabase
    .from('borrowers')
    .insert(result.data)
    .select('id')
    .single()

  if (error) {
    return actionError('Failed to create borrower. Please try again.')
  }

  revalidatePath('/dashboard/borrowers')
  return actionSuccess('Borrower created successfully.', { id: borrower.id })
}

async function _updateBorrower(
  id: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const raw = Object.fromEntries(formData)
  const result = BorrowerSchema.safeParse(raw)

  if (!result.success) {
    return actionError('Please fix the errors below.', z.flattenError(result.error).fieldErrors)
  }

  const supabase = await createClient()
  const { error } = await supabase.from('borrowers').update(result.data).eq('id', id)

  if (error) {
    return actionError('Failed to update borrower. Please try again.')
  }

  revalidatePath('/dashboard/borrowers')
  revalidatePath(`/dashboard/borrowers/${id}`)
  return actionSuccess('Borrower updated successfully.')
}

export const createBorrower = withSentry('createBorrower', _createBorrower)

export function updateBorrower(id: string) {
  return withSentry('updateBorrower', (prevState: ActionState, formData: FormData) =>
    _updateBorrower(id, prevState, formData)
  )
}
