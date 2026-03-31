/**
 * Orchestration layer for the MFK Lending finance engine.
 *
 * This is the single public API for schedule generation and loan status queries.
 * The rest of the application should import from '@/lib/finance', not from
 * the individual sub-modules.
 *
 * All monetary values are in centavos (integers). ₱1 = 100 centavos.
 */

import { calcDiminishingSchedule } from './diminishing'
import { calcFlatSchedule } from './flat-interest'
import { calcDaysOverdue, calcLatePenalty } from './penalties'
import type { LoanScheduleEntry, RecordedPayment } from './types'

/** Parameters for generating a loan schedule regardless of loan type */
export interface GenerateScheduleParams {
  /** Loan type — determines which amortization method is used */
  loanType: 'flat_interest' | 'diminishing' | 'hybrid_diminishing'
  /** Loan principal in centavos */
  principal: number
  /** Monthly interest rate as a decimal, e.g. 0.05 for 5% */
  rate: number
  /** Number of months in the loan term */
  termMonths: number
  /** Loan disbursement date in YYYY-MM-DD format */
  startDate: string
}

/** Summary statistics computed from a complete loan schedule */
export interface ScheduleSummary {
  /** Sum of all principalDue entries in centavos */
  totalPrincipal: number
  /** Sum of all interestDue entries in centavos */
  totalInterest: number
  /** totalPrincipal + totalInterest in centavos */
  totalRepayment: number
  /** Number of payment periods */
  numberOfPeriods: number
  /** Due date of the first period in YYYY-MM-DD format */
  firstDueDate: string
  /** Due date of the last period in YYYY-MM-DD format */
  lastDueDate: string
}

/** A schedule entry that is past due and has not been paid */
export interface OverdueEntry extends LoanScheduleEntry {
  /** Number of calendar days past the due date */
  daysLate: number
  /** Penalty amount in centavos (1% per day on the monthly interest) */
  penaltyAmount: number
}

/**
 * Generates a loan payment schedule for flat interest, diminishing balance,
 * or hybrid diminishing loans. This is the single entry point for schedule generation.
 *
 * For hybrid_diminishing loans, the schedule is generated identically to flat_interest:
 * borrower pays interest only each month, with principal due at the final period.
 * Actual partial principal returns are tracked separately in the principal_returns table
 * and do not affect the schedule structure.
 *
 * @param params - Schedule parameters including loanType (see GenerateScheduleParams)
 * @returns Array of LoanScheduleEntry, one per payment period
 * @throws Error if loanType is not 'flat_interest', 'diminishing', or 'hybrid_diminishing'
 *
 * @example
 * generateSchedule({ loanType: 'flat_interest', principal: 3000000, rate: 0.05, termMonths: 3, startDate: '2026-03-25' })
 * generateSchedule({ loanType: 'hybrid_diminishing', principal: 20000000, rate: 0.05, termMonths: 6, startDate: '2026-01-01' })
 */
export function generateSchedule(params: GenerateScheduleParams): LoanScheduleEntry[] {
  const { loanType, principal, rate, termMonths, startDate } = params

  if (loanType === 'flat_interest' || loanType === 'hybrid_diminishing') {
    return calcFlatSchedule({ principal, rate, termMonths, startDate })
  }

  if (loanType === 'diminishing') {
    return calcDiminishingSchedule({ principal, rate, termMonths, startDate })
  }

  throw new Error(
    `Unknown loan type: "${loanType}". Expected 'flat_interest', 'diminishing', or 'hybrid_diminishing'.`
  )
}

/**
 * Computes summary statistics from a complete loan schedule.
 *
 * @param schedule - Array of LoanScheduleEntry from generateSchedule
 * @returns ScheduleSummary with totals and date range
 *
 * @example
 * summarizeSchedule(flatSchedule)
 * // → { totalPrincipal: 3000000, totalInterest: 450000, totalRepayment: 3450000, numberOfPeriods: 3, ... }
 */
export function summarizeSchedule(schedule: LoanScheduleEntry[]): ScheduleSummary {
  if (schedule.length === 0) {
    throw new Error('summarizeSchedule: schedule must contain at least one period')
  }

  const totalPrincipal = schedule.reduce((sum, e) => sum + e.principalDue, 0)
  const totalInterest = schedule.reduce((sum, e) => sum + e.interestDue, 0)

  return {
    totalPrincipal,
    totalInterest,
    totalRepayment: totalPrincipal + totalInterest,
    numberOfPeriods: schedule.length,
    firstDueDate: schedule[0].dueDate,
    lastDueDate: schedule[schedule.length - 1].dueDate,
  }
}

/**
 * Returns all schedule entries that are past due and have not been paid.
 *
 * Payments are matched to schedule entries by index (payments[0] covers period 1, etc.).
 * An entry is overdue if its dueDate is strictly before asOfDate and it has no
 * recorded payment.
 *
 * @param schedule - Full loan schedule
 * @param payments - Recorded payments in period order
 * @param asOfDate - The reference date in YYYY-MM-DD format
 * @returns Array of OverdueEntry with daysLate and penaltyAmount filled in
 *
 * @example
 * getOverdueEntries(schedule, [], '2026-05-01')
 * // → entries for any periods whose dueDate < '2026-05-01'
 */
export function getOverdueEntries(
  schedule: LoanScheduleEntry[],
  payments: RecordedPayment[],
  asOfDate: string
): OverdueEntry[] {
  return schedule
    .map((entry, index) => {
      const daysLate = calcDaysOverdue(entry.dueDate, asOfDate)
      const isPaid = index < payments.length
      return { entry, daysLate, isPaid }
    })
    .filter(({ daysLate, isPaid }) => daysLate > 0 && !isPaid)
    .map(({ entry, daysLate }) => {
      const penaltyAmount = calcLatePenalty({ daysLate, monthlyInterest: entry.interestDue })
      return { ...entry, daysLate, penaltyAmount }
    })
}

/**
 * Returns true if the loan is fully paid — i.e., every schedule entry has a
 * corresponding recorded payment.
 *
 * Payments are matched to schedule entries by index. A loan is considered
 * fully paid when the number of recorded payments equals or exceeds the
 * number of schedule periods.
 *
 * @param schedule - Full loan schedule
 * @param payments - Recorded payments in period order
 * @returns true if all periods have been paid
 *
 * @example
 * isLoanFullyPaid(threeMonthSchedule, [p1, p2, p3]) // → true
 * isLoanFullyPaid(threeMonthSchedule, [p1, p2])     // → false
 */
export function isLoanFullyPaid(
  schedule: LoanScheduleEntry[],
  payments: RecordedPayment[]
): boolean {
  return payments.length >= schedule.length
}

/**
 * Computes the outstanding principal balance for a hybrid_diminishing loan.
 *
 * Outstanding balance = original principal − sum of all recorded partial returns.
 * Never returns a negative value (floored at 0).
 *
 * @param principal - Original loan principal in centavos
 * @param returns - Array of principal return records (amount in centavos)
 * @returns Outstanding balance in centavos
 *
 * @example
 * calcOutstandingBalance(20000000, [])
 * // → 20000000  (no returns yet — full principal outstanding)
 *
 * calcOutstandingBalance(20000000, [{ amount: 500000 }, { amount: 500000 }])
 * // → 19000000  (₱190,000 remaining)
 */
export function calcOutstandingBalance(
  principal: number,
  returns: Array<{ amount: number }>
): number {
  const totalReturned = returns.reduce((sum, r) => sum + r.amount, 0)
  return Math.max(0, principal - totalReturned)
}

/**
 * Computes the monthly interest payment on the current outstanding balance.
 *
 * Used for hybrid_diminishing loans where the interest reduces as partial
 * principal returns are recorded.
 *
 * @param outstandingBalance - Current outstanding principal in centavos
 * @param rate - Monthly interest rate as a decimal (e.g. 0.05 for 5%)
 * @returns Monthly interest amount in centavos (rounded to nearest centavo)
 *
 * @example
 * calcInterestOnBalance(20000000, 0.05)  // → 1000000  (₱10,000)
 * calcInterestOnBalance(19500000, 0.05)  // → 975000   (₱9,750)
 * calcInterestOnBalance(0, 0.05)         // → 0
 */
export function calcInterestOnBalance(outstandingBalance: number, rate: number): number {
  return Math.round(outstandingBalance * rate)
}
