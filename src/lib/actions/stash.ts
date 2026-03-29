'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { type ActionState, actionError, actionSuccess } from '@/lib/actions'
import { createClient } from '@/lib/supabase/server'
import { ContributionSchema, DividendSchema } from '@/lib/validations/stash.schema'

export async function recordContribution(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const raw = Object.fromEntries(formData)
  const result = ContributionSchema.safeParse(raw)

  if (!result.success) {
    return actionError('Please fix the errors below.', z.flattenError(result.error).fieldErrors)
  }

  const { partner_id, month, amount_pesos, remarks } = result.data
  const amount = Math.round(amount_pesos * 100)

  const supabase = await createClient()

  // Check for duplicate contribution for same partner + month
  const { data: existing, error: checkError } = await supabase
    .from('contributions')
    .select('id')
    .eq('partner_id', partner_id)
    .eq('month', month)
    .maybeSingle()

  if (checkError) {
    return actionError('Failed to validate contribution. Please try again.')
  }

  if (existing) {
    return actionError('A contribution already exists for this partner and month.', {
      month: ['This partner has already contributed for the selected month.'],
    })
  }

  const { error: insertError } = await supabase.from('contributions').insert({
    partner_id,
    month,
    amount,
    paid_at: new Date().toISOString(),
    remarks: remarks ?? null,
  })

  if (insertError) {
    return actionError('Failed to record contribution. Please try again.')
  }

  revalidatePath('/dashboard/stash')
  return actionSuccess('Contribution recorded successfully.')
}

export async function recordDividend(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const raw = Object.fromEntries(formData)
  const result = DividendSchema.safeParse(raw)

  if (!result.success) {
    return actionError('Please fix the errors below.', z.flattenError(result.error).fieldErrors)
  }

  const { month, amount_each_pesos, remarks } = result.data
  const amount = Math.round(amount_each_pesos * 100)
  // Use the first day of the selected month as the distribution date
  const distributed_at = new Date(`${month}-01T00:00:00+08:00`).toISOString()

  const supabase = await createClient()

  // Fetch all partners
  const { data: partners, error: partnersError } = await supabase.from('partners').select('id')

  if (partnersError || !partners || partners.length === 0) {
    return actionError('Failed to fetch partners. Please try again.')
  }

  const dividendRows = partners.map((partner) => ({
    partner_id: partner.id,
    amount,
    distributed_at,
    remarks: remarks ?? null,
  }))

  const { error: insertError } = await supabase.from('dividends').insert(dividendRows)

  if (insertError) {
    return actionError('Failed to record dividends. Please try again.')
  }

  revalidatePath('/dashboard/stash')
  return actionSuccess('Dividends recorded successfully.')
}
