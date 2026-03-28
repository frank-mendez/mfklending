/**
 * Diminishing balance loan calculations for MFK Lending Corp.
 *
 * In a diminishing balance loan, the borrower pays a fixed monthly amount
 * that covers both interest on the remaining balance and a portion of principal.
 * As the principal decreases, the interest portion shrinks and the principal
 * portion grows each month.
 *
 * All monetary values are in centavos (integers). ₱1 = 100 centavos.
 */

import { addMonths, format, parseISO } from 'date-fns'
import type { LoanScheduleEntry, RecordedPayment } from './types'

/** Parameters for generating a diminishing balance loan schedule */
export interface DiminishingScheduleParams {
  /** Loan principal in centavos */
  principal: number
  /** Monthly interest rate as a decimal, e.g. 0.05 for 5% */
  rate: number
  /** Number of months in the loan term */
  termMonths: number
  /** Loan disbursement date in YYYY-MM-DD format */
  startDate: string
}

/**
 * Calculates the fixed monthly payment for a diminishing balance loan
 * using the standard amortization formula.
 *
 * Formula: P × [r(1+r)^n] / [(1+r)^n − 1]
 * where r = monthly rate, n = number of periods
 *
 * @param principal - Loan principal in centavos
 * @param rate - Monthly interest rate as a decimal (e.g. 0.05 for 5%)
 * @param termMonths - Number of months in the loan term
 * @returns Fixed monthly payment in centavos (integer)
 *
 * @example
 * calcDiminishingMonthlyPayment(3000000, 0.05, 12) // → 338477 (≈₱3,384.77)
 */
export function calcDiminishingMonthlyPayment(
  principal: number,
  rate: number,
  termMonths: number
): number {
  if (termMonths <= 0) {
    throw new Error('calcDiminishingMonthlyPayment: termMonths must be a positive integer')
  }
  if (rate === 0) return Math.round(principal / termMonths)
  const factor = (1 + rate) ** termMonths
  return Math.round((principal * rate * factor) / (factor - 1))
}

/**
 * Generates the full amortization schedule for a diminishing balance loan.
 *
 * Each period: interest = remaining balance × rate; principal = payment − interest.
 * The final period closes the balance to exactly 0 by setting principalDue = remainingBalance,
 * which absorbs any accumulated rounding difference.
 *
 * @param params - Diminishing schedule parameters (see DiminishingScheduleParams)
 * @returns Array of LoanScheduleEntry, one per payment period
 *
 * @example
 * // ₱30,000 loan at 5% for 3 months starting 2026-03-25
 * calcDiminishingSchedule({ principal: 3000000, rate: 0.05, termMonths: 3, startDate: '2026-03-25' })
 * // Period 1: highest interestDue, lowest principalDue
 * // Period 3: lowest interestDue, highest principalDue, balanceAfter = 0
 */
export function calcDiminishingSchedule(params: DiminishingScheduleParams): LoanScheduleEntry[] {
  const { principal, rate, termMonths, startDate } = params
  const monthlyPayment = calcDiminishingMonthlyPayment(principal, rate, termMonths)
  const baseDate = parseISO(startDate)
  const schedule: LoanScheduleEntry[] = []
  let remainingBalance = principal

  for (let period = 1; period <= termMonths; period++) {
    const isFinalPeriod = period === termMonths
    const dueDate = format(addMonths(baseDate, period), 'yyyy-MM-dd')
    const interestDue = Math.round(remainingBalance * rate)

    let principalDue: number
    let balanceAfter: number

    if (isFinalPeriod) {
      // Rounding adjustment: close the balance to exactly 0
      principalDue = remainingBalance
      balanceAfter = 0
    } else {
      principalDue = monthlyPayment - interestDue
      balanceAfter = remainingBalance - principalDue
    }

    const totalDue = principalDue + interestDue

    schedule.push({
      periodNumber: period,
      dueDate,
      principalDue,
      interestDue,
      totalDue,
      balanceAfter,
    })

    remainingBalance = balanceAfter
  }

  return schedule
}

/**
 * Calculates the current outstanding principal balance given a loan schedule
 * and a list of payments that have been recorded.
 *
 * Only payments with paymentType 'principal' or 'full' reduce the principal balance.
 * Payments are matched to schedule entries by index (first payment → period 1, etc.).
 * For each matched entry whose payment type is 'principal' or 'full',
 * that period's principalDue is subtracted from the original principal.
 *
 * @param schedule - Full loan schedule (from calcFlatSchedule or calcDiminishingSchedule)
 * @param payments - Recorded payments in chronological order
 * @returns Remaining principal balance in centavos (integer, never negative)
 *
 * @example
 * // Flat ₱30,000 loan, no payments yet
 * calcRemainingBalance(schedule, []) // → 3000000
 * // After all 3 payments (including final principal)
 * calcRemainingBalance(schedule, allPayments) // → 0
 */
export function calcRemainingBalance(
  schedule: LoanScheduleEntry[],
  payments: RecordedPayment[]
): number {
  const originalPrincipal = schedule.reduce((sum, entry) => sum + entry.principalDue, 0)

  let principalPaid = 0
  const count = Math.min(schedule.length, payments.length)
  for (let i = 0; i < count; i++) {
    const payment = payments[i]
    if (payment.paymentType === 'principal' || payment.paymentType === 'full') {
      principalPaid += schedule[i].principalDue
    }
  }

  return Math.max(0, originalPrincipal - principalPaid)
}
