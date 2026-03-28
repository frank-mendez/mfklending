/**
 * Shared types for the MFK Lending finance engine.
 * All monetary values are in centavos (integer). ₱1 = 100 centavos.
 */

export interface LoanScheduleEntry {
  /** 1-based period number */
  periodNumber: number
  /** Due date in YYYY-MM-DD format */
  dueDate: string
  /** Principal due in centavos */
  principalDue: number
  /** Interest due in centavos */
  interestDue: number
  /** Total due in centavos — principalDue + interestDue */
  totalDue: number
  /** Remaining principal after this payment in centavos */
  balanceAfter: number
}

export interface RecordedPayment {
  /** Amount paid in centavos */
  amountPaid: number
  paymentType: 'interest' | 'principal' | 'penalty' | 'full'
}
