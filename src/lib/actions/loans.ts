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

    revalidatePath('/loans')
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

    revalidatePath(`/loans/${loan_id}`)
    return actionSuccess('Payment recorded successfully.')
  } catch (err) {
    console.error('[recordPayment]', err)
    return actionError('An unexpected error occurred. Please try again.')
  }
}

// ─── toggleReminders ──────────────────────────────────────────────────────────

export async function toggleReminders(loanId: string, enabled: boolean): Promise<ActionState> {
  const supabase = await createClient()

  if (enabled) {
    // Verify there is at least one pending schedule entry before enabling
    const { count, error: countError } = await supabase
      .from('loan_schedules')
      .select('id', { count: 'exact', head: true })
      .eq('loan_id', loanId)
      .eq('status', 'pending')

    if (countError) {
      console.error('[toggleReminders] Failed to count pending schedules', countError)
      return actionError('Could not verify upcoming payments. Please try again.')
    }

    if (!count || count === 0) {
      return actionError('No upcoming payments to remind for. Add a schedule entry first.')
    }
  }

  const { error } = await supabase
    .from('loans')
    .update({ reminders_enabled: enabled })
    .eq('id', loanId)

  if (error) {
    console.error('[toggleReminders]', error)
    return actionError('Could not update reminders setting.')
  }

  revalidatePath('/import/verify')
  revalidatePath(`/loans/${loanId}`)

  return actionSuccess(enabled ? 'Reminders enabled.' : 'Reminders disabled.')
}

// ─── recordPrincipalReturn ────────────────────────────────────────────────────

export async function recordPrincipalReturn(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const loanId = formData.get('loan_id') as string
  const amountPesos = Number.parseFloat(formData.get('amount_pesos') as string)
  const returnedAt = formData.get('returned_at') as string
  const remarks = (formData.get('remarks') as string) || null

  if (!loanId || Number.isNaN(amountPesos) || amountPesos <= 0) {
    return actionError('Amount must be a positive number.')
  }
  if (!returnedAt) {
    return actionError('Return date is required.')
  }

  const amountCentavos = Math.round(amountPesos * 100)
  const supabase = await createClient()

  // Verify amount does not exceed outstanding balance
  const { data: loan } = await supabase
    .from('loans')
    .select('principal, principal_returns(amount)')
    .eq('id', loanId)
    .single()

  if (!loan) return actionError('Loan not found.')

  type ReturnRow = { amount: number }
  const returned = (loan.principal_returns as ReturnRow[]).reduce(
    (s: number, r: ReturnRow) => s + r.amount,
    0
  )
  const outstanding = Math.max(0, loan.principal - returned)

  if (amountCentavos > outstanding) {
    return actionError(`Amount exceeds outstanding balance of ₱${(outstanding / 100).toFixed(2)}.`)
  }

  const { error: insertErr } = await supabase.from('principal_returns').insert({
    loan_id: loanId,
    amount: amountCentavos,
    returned_at: returnedAt,
    remarks,
  })

  if (insertErr) {
    console.error('[recordPrincipalReturn]', insertErr)
    return actionError('Could not record the principal return.')
  }

  // If fully paid, update loan status
  const newOutstanding = outstanding - amountCentavos
  if (newOutstanding === 0) {
    await supabase.from('loans').update({ status: 'paid' }).eq('id', loanId)
  }

  revalidatePath(`/loans/${loanId}`)
  revalidatePath('/import/verify')

  return actionSuccess('Principal return recorded.')
}
