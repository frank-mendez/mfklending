// ─── Enum-style Literal Types ────────────────────────────────────────────────

export type LoanType = 'flat_interest' | 'diminishing' | 'hybrid_diminishing'

export type LoanStatus = 'active' | 'paid' | 'defaulted' | 'overdue'

export type ContractStatus = 'none' | 'pending_signature' | 'signed' | 'declined' | 'expired'

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
  contract_status: ContractStatus
  contract_sent_at: string | null
  contract_signed_at: string | null
  contract_signed_pdf_path: string | null
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
  /** Original principal of active/overdue loans in centavos */
  total_principal_loaned: number
  /** Outstanding balance (principal minus returns) of active/overdue loans in centavos */
  total_outstanding_balance: number
  /** Stored in centavos (integer) */
  total_collected_interest: number
  /** Stored in centavos (integer) */
  total_penalties: number
  /** Stored in centavos (integer) */
  total_dividends_paid: number
  /** stash + interest + penalties − dividends − outstanding loans, in centavos */
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

// ─── Notifications ──────────────────────────────────────────────────────────

export type NotificationChannel = 'email' | 'sms'

export type NotificationTypeEnum =
  | 'reminder_3day'
  | 'reminder_1day'
  | 'reminder_due'
  | 'overdue_1day'
  | 'overdue_7day'
  | 'overdue_weekly'

export interface NotificationLog {
  id: string
  loan_id: string
  schedule_id: string | null
  borrower_id: string
  channel: NotificationChannel
  notification_type: NotificationTypeEnum
  recipient: string
  subject: string | null
  body: string
  status: 'pending' | 'sent' | 'failed'
  error: string | null
  sent_at: string | null
  created_at: string
}

// What the reminder engine produces before sending
export interface PendingNotification {
  loanId: string
  scheduleId: string | null
  borrowerId: string
  borrowerName: string
  borrowerEmail: string
  borrowerPhone: string
  channel: NotificationChannel
  notificationType: NotificationTypeEnum
  daysUntilDue: number // negative = overdue
  dueDate: string // YYYY-MM-DD
  amountDue: number // centavos
  penaltyAmount: number // centavos, 0 if not overdue
  outstandingBalance: number // centavos
}

export interface PartnerEscalation {
  loanId: string
  borrowerName: string
  daysOverdue: number
  totalOverdueAmount: number // centavos — sum of overdue schedule entries
  penaltyAccrued: number // centavos
  scheduleEntries: Array<{
    period: number
    dueDate: string
    amountDue: number
    daysLate: number
    penalty: number
  }>
}

// ─── Contract Generation ──────────────────────────────────────────────────────

export interface ContractData {
  // Borrower fields
  borrowerFullName: string
  borrowerAge: number
  borrowerOccupation: string
  borrowerPhone: string
  borrowerEmail: string
  borrowerBank: string
  borrowerAccountName: string
  borrowerAccountNumber: string

  // Loan fields
  loanPurpose: string | null
  /** Principal in centavos */
  principalCentavos: number
  /** Interest rate as decimal e.g. 0.05 */
  interestRate: number
  termMonths: number
  /** Monthly interest in centavos */
  monthlyInterestCentavos: number
  /** Total repayment in centavos (principal + all interest) */
  totalRepaymentCentavos: number

  // MFK static fields
  mfkBankName: string // 'GoTyme Bank'
  mfkAccountName: string // 'MFK Lending Corp'
  mfkAccountNumber: string // '014721202843'

  // Document metadata
  documentDate: string // formatted: 'March 25, 2026'
  loanId: string
}

export interface SignWellWebhookPayload {
  event: 'document_completed' | 'document_declined' | 'document_expired'
  document: {
    id: string
    status: string
    completed_at: string | null
    declined_at: string | null
    files: Array<{
      url: string
    }>
  }
}
