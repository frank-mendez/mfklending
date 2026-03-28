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
  loanType: 'flat_interest' | 'diminishing'
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
 * Generates a loan payment schedule for either a flat interest or diminishing
 * balance loan. This is the single entry point for schedule generation.
 *
 * @param params - Schedule parameters including loanType (see GenerateScheduleParams)
 * @returns Array of LoanScheduleEntry, one per payment period
 * @throws Error if loanType is not 'flat_interest' or 'diminishing'
 *
 * @example
 * generateSchedule({ loanType: 'flat_interest', principal: 3000000, rate: 0.05, termMonths: 3, startDate: '2026-03-25' })
 */
export function generateSchedule(params: GenerateScheduleParams): LoanScheduleEntry[] {
  const { loanType, principal, rate, termMonths, startDate } = params

  if (loanType === 'flat_interest') {
    return calcFlatSchedule({ principal, rate, termMonths, startDate })
  }

  if (loanType === 'diminishing') {
    return calcDiminishingSchedule({ principal, rate, termMonths, startDate })
  }

  throw new Error(`Unknown loan type: "${loanType}". Expected 'flat_interest' or 'diminishing'.`)
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
    .filter((entry, index) => {
      const isPaid = index < payments.length
      const daysLate = calcDaysOverdue(entry.dueDate, asOfDate)
      return daysLate > 0 && !isPaid
    })
    .map((entry) => {
      const daysLate = calcDaysOverdue(entry.dueDate, asOfDate)
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
