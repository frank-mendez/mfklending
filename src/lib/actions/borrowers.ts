'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { type ActionState, actionError, actionSuccess } from '@/lib/actions'
import { createClient } from '@/lib/supabase/server'
import { BorrowerSchema } from '@/lib/validations/borrower.schema'

export async function createBorrower(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
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

    revalidatePath('/borrowers')
    return actionSuccess('Borrower created successfully.', { id: borrower.id })
  } catch (err) {
    console.error('[createBorrower]', err)
    return actionError('An unexpected error occurred. Please try again.')
  }
}

/** id is passed as a hidden form field named "borrower_id" */
export async function updateBorrower(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const id = formData.get('borrower_id') as string
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

    revalidatePath('/borrowers')
    revalidatePath(`/borrowers/${id}`)
    return actionSuccess('Borrower updated successfully.')
  } catch (err) {
    console.error('[updateBorrower]', err)
    return actionError('An unexpected error occurred. Please try again.')
  }
}
