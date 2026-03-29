'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { type ActionState, actionError, actionSuccess } from '@/lib/actions'
import { generateSchedule } from '@/lib/finance'
import { calcDaysOverdue, calcLatePenalty } from '@/lib/finance/penalties'
import { createClient } from '@/lib/supabase/server'
import { todayManila } from '@/lib/utils/date'
import { CreateLoanSchema, RecordPaymentSchema } from '@/lib/validations/loan.schema'

export async function createLoan(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const raw = Object.fromEntries(formData)
    const result = CreateLoanSchema.safeParse(raw)

    if (!result.success) {
      return actionError('Please fix the errors below.', z.flattenError(result.error).fieldErrors)
    }

    const { borrower_id, loan_type, principal_pesos, term_months, start_date, purpose } =
      result.data
    const principal = Math.round(principal_pesos * 100)

    // Generate schedule first so end_date comes from the last period's dueDate,
    // avoiding timezone-dependent new Date(YYYY-MM-DD) off-by-one issues.
    const schedule = generateSchedule({
      loanType: loan_type,
      principal,
      rate: 0.05,
      termMonths: term_months,
      startDate: start_date,
    })
    const end_date = schedule[schedule.length - 1]?.dueDate ?? start_date

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
      await supabase.from('loans').delete().eq('id', loan.id)
      return actionError('Failed to generate loan schedule. Please try again.')
    }

    revalidatePath('/dashboard/loans')
    return actionSuccess('Loan created successfully.', { loanId: loan.id })
  } catch (err) {
    console.error('[createLoan]', err)
    return actionError('An unexpected error occurred. Please try again.')
  }
}

export async function recordPayment(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const raw = Object.fromEntries(formData)
    const result = RecordPaymentSchema.safeParse(raw)

    if (!result.success) {
      return actionError('Please fix the errors below.', z.flattenError(result.error).fieldErrors)
    }

    const { loan_id, schedule_id, amount_paid_pesos, paid_at, payment_type, remarks } = result.data

    const amount_paid = Math.round(amount_paid_pesos * 100)

    const supabase = await createClient()

    // Fetch schedule server-side to verify ownership and compute penalty authoritatively
    const { data: scheduleRow, error: scheduleError } = await supabase
      .from('loan_schedules')
      .select('loan_id, due_date, interest_due')
      .eq('id', schedule_id)
      .single()

    if (scheduleError || !scheduleRow) {
      return actionError('Could not load schedule. Please try again.')
    }

    if (scheduleRow.loan_id !== loan_id) {
      return actionError('Invalid payment data.')
    }

    const late_days = calcDaysOverdue(scheduleRow.due_date, paid_at)
    const penalty_amount = calcLatePenalty({
      daysLate: late_days,
      monthlyInterest: scheduleRow.interest_due,
    })

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

    // Only close the period when the full amount is settled
    if (payment_type === 'full') {
      const { error: scheduleUpdateError } = await supabase
        .from('loan_schedules')
        .update({ status: 'paid' })
        .eq('id', schedule_id)

      if (scheduleUpdateError) {
        return actionError('Payment recorded but failed to update schedule status.')
      }

      const { data: allSchedules, error: schedulesError } = await supabase
        .from('loan_schedules')
        .select('status')
        .eq('loan_id', loan_id)

      if (!schedulesError && allSchedules) {
        const allPaid = allSchedules.every((s) => s.status === 'paid')

        if (allPaid) {
          await supabase.from('loans').update({ status: 'paid' }).eq('id', loan_id)
        } else {
          const today = todayManila()
          await supabase
            .from('loan_schedules')
            .update({ status: 'late' })
            .eq('loan_id', loan_id)
            .eq('status', 'pending')
            .lt('due_date', today)
        }
      }
    }

    revalidatePath(`/dashboard/loans/${loan_id}`)
    return actionSuccess('Payment recorded successfully.')
  } catch (err) {
    console.error('[recordPayment]', err)
    return actionError('An unexpected error occurred. Please try again.')
  }
}
