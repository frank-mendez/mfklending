// ─── Enum-style Literal Types ────────────────────────────────────────────────

export type LoanType = 'flat_interest' | 'diminishing' | 'hybrid_diminishing'

export type LoanStatus = 'active' | 'paid' | 'defaulted' | 'overdue'

export type ScheduleStatus = 'pending' | 'paid' | 'late'

export type PaymentType = 'interest' | 'principal' | 'penalty' | 'full'

export type BankTransactionType = 'credit' | 'debit'

export type BankTransactionSource = 'gotyme_import' | 'manual'

export type ImportType = 'stash' | 'lending' | 'diminishing' | 'summary'
export type ImportStatus = 'pending' | 'completed' | 'failed'

// ─── Core Domain Interfaces ───────────────────────────────────────────────────

export interface Partner {
  id: string
  name: string
  email: string
  phone: string
  created_at: string
}

export interface Contribution {
  id: string
  partner_id: string
  /** Stored in centavos (integer) */
  amount: number
  month: string // YYYY-MM
  paid_at: string
  remarks: string | null
  created_at: string
}

export interface Dividend {
  id: string
  partner_id: string
  /** Stored in centavos (integer) */
  amount: number
  distributed_at: string
  remarks: string | null
  created_at: string
}

export interface Borrower {
  id: string
  full_name: string
  age: number
  occupation: string
  email: string
  phone: string
  bank_name: string
  account_name: string
  account_number: string
  created_at: string
}

export interface Loan {
  id: string
  borrower_id: string
  loan_type: LoanType
  /** Stored in centavos (integer) */
  principal: number
  interest_rate: number // e.g. 0.05 for 5%
  term_months: number
  start_date: string // YYYY-MM-DD
  end_date: string // YYYY-MM-DD
  disbursed_at: string | null
  status: LoanStatus
  signwell_document_id: string | null
  contract_url: string | null
  reminders_enabled: boolean
  imported_at: string | null
  import_source: string | null
  created_at: string
  updated_at: string
  borrower?: Borrower
}

export interface LoanSchedule {
  id: string
  loan_id: string
  due_date: string // YYYY-MM-DD
  period_number: number
  /** Stored in centavos (integer) */
  principal_due: number
  /** Stored in centavos (integer) */
  interest_due: number
  /** Stored in centavos (integer) */
  total_due: number
  /** Stored in centavos (integer) */
  balance_after: number
  status: ScheduleStatus
}

export interface Payment {
  id: string
  loan_id: string
  schedule_id: string | null
  /** Stored in centavos (integer) */
  amount_paid: number
  paid_at: string
  payment_type: PaymentType
  late_days: number
  /** Stored in centavos (integer) */
  penalty_amount: number
  remarks: string | null
  created_at: string
  schedule?: LoanSchedule
}

export interface BankTransaction {
  id: string
  transaction_date: string // YYYY-MM-DD
  description: string
  /** Stored in centavos (integer) */
  amount: number
  type: BankTransactionType
  /** Stored in centavos (integer) */
  balance: number
  source: BankTransactionSource
  reference_no: string | null
  created_at: string
}

export interface FundSummary {
  /** Stored in centavos (integer) */
  total_stash: number
  /** Stored in centavos (integer) */
  total_loaned_out: number
  /** Stored in centavos (integer) */
  total_collected_interest: number
  /** Stored in centavos (integer) */
  total_penalties: number
  /** Stored in centavos (integer) */
  total_dividends_paid: number
  /** Stored in centavos (integer) */
  current_balance: number
}

// ─── Utility / Composite Types ────────────────────────────────────────────────

export type LoanWithBorrower = Loan & { borrower: Borrower }

export type LoanWithSchedules = Loan & { loan_schedules: LoanSchedule[] }

export type LoanFull = Loan & {
  borrower: Borrower
  loan_schedules: LoanSchedule[]
  payments: Payment[]
}

export interface PrincipalReturn {
  id: string
  loan_id: string
  /** Stored in centavos (integer) */
  amount: number
  returned_at: string // YYYY-MM-DD
  remarks: string | null
  created_at: string
}

export interface ImportLog {
  id: string
  import_type: ImportType
  status: ImportStatus
  filename: string
  rows_parsed: number
  rows_imported: number
  rows_skipped: number
  errors: Array<{ row: number; message: string }> | null
  imported_by: string | null
  created_at: string
  completed_at: string | null
}

// ─── Import / Composite Types ─────────────────────────────────────────────────

export type LoanWithReturns = Loan & {
  principal_returns: PrincipalReturn[]
  /** Computed: principal - SUM(principal_returns.amount) */
  outstanding_balance: number
}
