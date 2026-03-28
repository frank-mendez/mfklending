/**
 * Flat interest loan calculations for MFK Lending Corp.
 *
 * In a flat interest loan, the borrower pays interest-only each month
 * and repays the full principal at the end of the term.
 *
 * All monetary values are in centavos (integers). ₱1 = 100 centavos.
 */

import { addMonths, format, parseISO } from 'date-fns'
import type { LoanScheduleEntry } from './types'

/** Parameters for generating a flat interest loan schedule */
export interface FlatScheduleParams {
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
 * Calculates the monthly interest payment for a flat interest loan.
 *
 * @param principal - Loan principal in centavos
 * @param rate - Monthly interest rate as a decimal (e.g. 0.05 for 5%)
 * @returns Monthly interest amount in centavos (integer)
 *
 * @example
 * calcMonthlyInterest(3000000, 0.05) // → 150000 (₱1,500.00)
 */
export function calcMonthlyInterest(principal: number, rate: number): number {
  return Math.round(principal * rate)
}

/**
 * Calculates the total repayment amount at the end of the loan term
 * (principal + all interest payments combined).
 *
 * @param principal - Loan principal in centavos
 * @param rate - Monthly interest rate as a decimal (e.g. 0.05 for 5%)
 * @param termMonths - Number of months in the loan term
 * @returns Total repayment amount in centavos (integer)
 *
 * @example
 * calcFlatTotalRepayment(3000000, 0.05, 3) // → 3450000 (₱34,500.00)
 */
export function calcFlatTotalRepayment(
  principal: number,
  rate: number,
  termMonths: number
): number {
  return principal + calcMonthlyInterest(principal, rate) * termMonths
}

/**
 * Calculates the total interest portion only (excluding principal)
 * for the full loan term.
 *
 * @param principal - Loan principal in centavos
 * @param rate - Monthly interest rate as a decimal (e.g. 0.05 for 5%)
 * @param termMonths - Number of months in the loan term
 * @returns Total interest in centavos (integer)
 *
 * @example
 * calcFlatTotalInterest(3000000, 0.05, 3) // → 450000 (₱4,500.00)
 */
export function calcFlatTotalInterest(principal: number, rate: number, termMonths: number): number {
  return calcMonthlyInterest(principal, rate) * termMonths
}

/**
 * Generates the full payment schedule for a flat interest loan.
 *
 * Periods 1 through (termMonths - 1) are interest-only payments.
 * The final period includes both the full principal and the last interest payment.
 *
 * @param params - Flat schedule parameters (see FlatScheduleParams)
 * @returns Array of LoanScheduleEntry, one per payment period
 *
 * @example
 * // ₱30,000 loan at 5% for 3 months starting 2026-03-25
 * calcFlatSchedule({ principal: 3000000, rate: 0.05, termMonths: 3, startDate: '2026-03-25' })
 * // Period 1: due 2026-04-25, principal 0,       interest 150000, total 150000,  balance 3000000
 * // Period 2: due 2026-05-25, principal 0,       interest 150000, total 150000,  balance 3000000
 * // Period 3: due 2026-06-25, principal 3000000, interest 150000, total 3150000, balance 0
 */
export function calcFlatSchedule(params: FlatScheduleParams): LoanScheduleEntry[] {
  const { principal, rate, termMonths, startDate } = params
  const monthlyInterest = calcMonthlyInterest(principal, rate)
  const baseDate = parseISO(startDate)
  const schedule: LoanScheduleEntry[] = []

  for (let period = 1; period <= termMonths; period++) {
    const isFinalPeriod = period === termMonths
    const dueDate = format(addMonths(baseDate, period), 'yyyy-MM-dd')
    const principalDue = isFinalPeriod ? principal : 0
    const interestDue = monthlyInterest
    const totalDue = principalDue + interestDue
    const balanceAfter = isFinalPeriod ? 0 : principal

    schedule.push({
      periodNumber: period,
      dueDate,
      principalDue,
      interestDue,
      totalDue,
      balanceAfter,
    })
  }

  return schedule
}
