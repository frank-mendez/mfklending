/**
 * Late payment penalty calculations for MFK Lending Corp.
 *
 * MFK's penalty rule: 1% per day on the MONTHLY INTEREST AMOUNT (not the principal).
 * This is specific to MFK's lending policy — penalties apply to the interest owed,
 * not to the outstanding loan balance.
 *
 * All monetary values are in centavos (integers). ₱1 = 100 centavos.
 */

import { differenceInCalendarDays, parseISO } from 'date-fns'

/** Parameters for a single late payment penalty calculation */
export interface LatePenaltyParams {
  /** Number of calendar days past the due date */
  daysLate: number
  /** The monthly interest amount that was due, in centavos */
  monthlyInterest: number
}

/** Parameters for computing total accrued penalties across multiple overdue periods */
export interface AccruedPenaltyParams {
  /** Array of overdue periods, each with days late and the interest that was due */
  overdueEntries: Array<{
    daysLate: number
    monthlyInterest: number
  }>
}

/** Parameters for computing the total amount a borrower currently owes */
export interface TotalAmountDueParams {
  /** Remaining loan principal in centavos */
  outstandingPrincipal: number
  /** Sum of all unpaid interest due amounts in centavos */
  unpaidInterest: number
  /** Total accrued penalties in centavos (from calcAccruedPenalty) */
  accruedPenalties: number
}

/**
 * Calculates the late penalty for a single overdue interest payment.
 *
 * MFK policy: 1% per day on the monthly interest amount.
 * Formula: Math.round(daysLate × 0.01 × monthlyInterest)
 *
 * IMPORTANT: The penalty is on the INTEREST AMOUNT, not the principal.
 *
 * @param params.daysLate - Calendar days past due date (0 or negative → no penalty)
 * @param params.monthlyInterest - The interest amount that was due, in centavos
 * @returns Penalty amount in centavos (integer)
 *
 * @example
 * // 5 days late on ₱1,500 monthly interest
 * calcLatePenalty({ daysLate: 5, monthlyInterest: 150000 }) // → 7500 (₱75.00)
 */
export function calcLatePenalty(params: LatePenaltyParams): number {
  const { daysLate, monthlyInterest } = params
  if (daysLate <= 0) return 0
  return Math.round(daysLate * 0.01 * monthlyInterest)
}

/**
 * Calculates the total accrued penalty across multiple overdue periods.
 *
 * Sums the individual penalty for each overdue schedule entry.
 *
 * @param params.overdueEntries - Array of overdue periods with daysLate and monthlyInterest
 * @returns Total accrued penalty in centavos (integer)
 *
 * @example
 * calcAccruedPenalty({
 *   overdueEntries: [
 *     { daysLate: 5, monthlyInterest: 150000 },
 *     { daysLate: 0, monthlyInterest: 150000 },
 *   ]
 * }) // → 7500 (₱75.00)
 */
export function calcAccruedPenalty(params: AccruedPenaltyParams): number {
  return params.overdueEntries.reduce((sum, entry) => sum + calcLatePenalty(entry), 0)
}

/**
 * Calculates the total amount a borrower currently owes.
 *
 * Formula: outstandingPrincipal + unpaidInterest + accruedPenalties
 *
 * @param params.outstandingPrincipal - Remaining loan principal in centavos
 * @param params.unpaidInterest - Sum of all unpaid interest due in centavos
 * @param params.accruedPenalties - Total accrued penalties in centavos
 * @returns Total amount due in centavos (integer)
 *
 * @example
 * calcTotalAmountDue({
 *   outstandingPrincipal: 3000000,
 *   unpaidInterest: 150000,
 *   accruedPenalties: 7500,
 * }) // → 3157500
 */
export function calcTotalAmountDue(params: TotalAmountDueParams): number {
  const { outstandingPrincipal, unpaidInterest, accruedPenalties } = params
  return outstandingPrincipal + unpaidInterest + accruedPenalties
}

/**
 * Calculates the number of calendar days a payment is overdue.
 *
 * Returns 0 if asOfDate is on or before dueDate (not yet overdue).
 * Never returns a negative number.
 *
 * @param dueDate - The payment due date in YYYY-MM-DD format
 * @param asOfDate - The date to check against in YYYY-MM-DD format
 * @returns Number of days overdue (0 if not overdue)
 *
 * @example
 * calcDaysOverdue('2026-04-25', '2026-04-30') // → 5
 * calcDaysOverdue('2026-04-25', '2026-04-25') // → 0
 * calcDaysOverdue('2026-04-25', '2026-04-20') // → 0
 */
export function calcDaysOverdue(dueDate: string, asOfDate: string): number {
  const days = differenceInCalendarDays(parseISO(asOfDate), parseISO(dueDate))
  return Math.max(0, days)
}
