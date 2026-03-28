'use server'

import { addMonths, format } from 'date-fns'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { type ActionState, actionError, actionSuccess } from '@/lib/actions'
import { withSentry } from '@/lib/actions/with-sentry'
import { generateSchedule } from '@/lib/finance'
import { createClient } from '@/lib/supabase/server'
import { CreateLoanSchema, RecordPaymentSchema } from '@/lib/validations/loan.schema'

async function _createLoan(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const raw = Object.fromEntries(formData)
  const result = CreateLoanSchema.safeParse(raw)

  if (!result.success) {
    return actionError('Please fix the errors below.', z.flattenError(result.error).fieldErrors)
  }

  const { borrower_id, loan_type, principal_pesos, term_months, start_date, purpose } = result.data
  const principal = Math.round(principal_pesos * 100)
  const end_date = format(addMonths(new Date(start_date), term_months), 'yyyy-MM-dd')

  const supabase = await createClient()

  const { data: loan, error: loanError } = await supabase
    .from('loans')
    .insert({
      borrower_id,
      loan_type,
      principal,
      interest_rate: 0.05,
      term_months,
      start_date,
      end_date,
      status: 'active',
      purpose: purpose ?? null,
    })
    .select('id')
    .single()

  if (loanError || !loan) {
    return actionError('Failed to create loan. Please try again.')
  }

  const schedule = generateSchedule({
    loanType: loan_type,
    principal,
    rate: 0.05,
    termMonths: term_months,
    startDate: start_date,
  })

  const scheduleRows = schedule.map((entry) => ({
    loan_id: loan.id,
    due_date: entry.dueDate,
    period_number: entry.periodNumber,
    principal_due: entry.principalDue,
    interest_due: entry.interestDue,
    total_due: entry.totalDue,
    balance_after: entry.balanceAfter,
    status: 'pending' as const,
  }))

  const { error: scheduleError } = await supabase.from('loan_schedules').insert(scheduleRows)

  if (scheduleError) {
    // Attempt cleanup — delete the loan we just created
    await supabase.from('loans').delete().eq('id', loan.id)
    return actionError('Failed to generate loan schedule. Please try again.')
  }

  revalidatePath('/dashboard/loans')
  return actionSuccess('Loan created successfully.', { loanId: loan.id })
}

async function _recordPayment(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const raw = Object.fromEntries(formData)
  const result = RecordPaymentSchema.safeParse(raw)

  if (!result.success) {
    return actionError('Please fix the errors below.', z.flattenError(result.error).fieldErrors)
  }

  const {
    loan_id,
    schedule_id,
    amount_paid_pesos,
    penalty_amount_pesos,
    paid_at,
    payment_type,
    remarks,
    late_days,
  } = result.data

  const amount_paid = Math.round(amount_paid_pesos * 100)
  const penalty_amount = Math.round(penalty_amount_pesos * 100)

  const supabase = await createClient()

  // Insert the payment record
  const { error: paymentError } = await supabase.from('payments').insert({
    loan_id,
    schedule_id,
    amount_paid,
    paid_at,
    payment_type,
    late_days,
    penalty_amount,
    remarks: remarks ?? null,
  })

  if (paymentError) {
    return actionError('Failed to record payment. Please try again.')
  }

  // Mark the schedule entry as paid
  const { error: scheduleUpdateError } = await supabase
    .from('loan_schedules')
    .update({ status: 'paid' })
    .eq('id', schedule_id)

  if (scheduleUpdateError) {
    return actionError('Payment recorded but failed to update schedule status.')
  }

  // Check if all schedules for this loan are paid
  const { data: allSchedules, error: schedulesError } = await supabase
    .from('loan_schedules')
    .select('status')
    .eq('loan_id', loan_id)

  if (!schedulesError && allSchedules) {
    const allPaid = allSchedules.every((s) => s.status === 'paid')

    if (allPaid) {
      await supabase.from('loans').update({ status: 'paid' }).eq('id', loan_id)
    } else {
      // Mark any pending schedules past their due date as late
      const today = format(new Date(), 'yyyy-MM-dd')
      await supabase
        .from('loan_schedules')
        .update({ status: 'late' })
        .eq('loan_id', loan_id)
        .eq('status', 'pending')
        .lt('due_date', today)
    }
  }

  revalidatePath(`/dashboard/loans/${loan_id}`)
  return actionSuccess('Payment recorded successfully.')
}

export const createLoan = withSentry('createLoan', _createLoan)
export const recordPayment = withSentry('recordPayment', _recordPayment)
