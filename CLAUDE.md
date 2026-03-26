# MFK Lending Corporation — Project Intelligence

## Project Overview

A full-stack lending management system for **MFK Lending Corporation**, a small Filipino lending co-op run by three partners (Frank, Kim, Francis). The system automates payment reminders, generates loan contracts, and tracks all financial transactions — including monthly stash contributions, active/paid loans, dividends, and bank interest.

---

## Business Logic & Domain Rules

### Partners & Stash Fund
- Three partners: **Frank**, **Francis**, **Kim**
- Each contributes monthly into a shared fund ("stash")
  - ₱2,000/month (Oct 2022 – Nov 2023)
  - ₱3,000/month (Jan 2024 – present)
- Grand total stash as of Mar 2026: **₱333,000** (₱111,000 each)
- **Dividends**: Started in 2025; first distribution was Nov 2025 (₱10,000 each = ₱30,000 total)
- Remarks field tracks catch-up or irregular payments (e.g., lump-sum makeup payments)

### Loan Types

#### 1. Monthly Interest Loan (Flat)
- Borrower pays **interest only** each month (5% × principal)
- Principal is repaid in full at the **end of the loan term**
- Standard term: **3 months**
- Example (₱30,000 loan):
  - Monthly interest: ₱1,500
  - Total at end of term: ₱34,500 (₱30,000 principal + ₱4,500 interest)
- Late payment penalty: **1% per day** on accrued interest

#### 2. Diminishing Balance Loan
- Monthly payment reduces outstanding principal
- Interest is recalculated on the **remaining balance** each month
- Two known borrowers: Al Huber Allere (AHA) and Vanessa Zambas (VZ)
- Payment schedule is tracked separately per borrower

### Interest Rate
- Standard rate: **5% per month** (flat or diminishing depending on loan type)
- Rate is applied on outstanding balance

### Loan Lifecycle
1. Agreement created → sent via SignWell for e-signature
2. Funds disbursed to borrower's bank account (e.g., BPI)
3. Monthly interest payments to MFK GoTyme Bank account
4. Principal repaid at term end (for flat loans) or per amortization (diminishing)
5. Loan marked as **paid** (gray in spreadsheet) or **active** (colored)

### Contract Details (from sample agreement)
- MFK collection account: **GoTyme Bank**, Account Name: MFK Lending Corp, Account No.: `014721202843`
- Borrower disbursement via their personal online bank account
- Contract fields: Full Name, Age, Occupation, Contact, Email, Bank, Account No., Loan Purpose, Loan Amount
- Document is e-signed via **SignWell** (signwell.com)
- Document includes audit trail: created → sent → viewed → signed timestamps

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 (App Router, Turbopack) |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Backend | Next.js 15 Server Actions / Route Handlers |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| File Storage | Supabase Storage (for contracts) |
| PDF Generation | `@react-pdf/renderer` or `puppeteer` |
| Email/SMS | Resend (email) + Semaphore or Vonage (PH SMS) |
| E-Signature | SignWell API |
| Scheduling | Vercel Cron Jobs |
| Deployment | Vercel |

---

## Database Schema (Supabase)

### `partners`
```sql
id, name, email, phone, created_at
```

### `contributions`
```sql
id, partner_id, amount, month (YYYY-MM), paid_at, remarks, created_at
```

### `dividends`
```sql
id, partner_id, amount, distributed_at, remarks, created_at
```

### `borrowers`
```sql
id, full_name, age, occupation, email, phone,
bank_name, account_name, account_number, created_at
```

### `loans`
```sql
id, borrower_id, loan_type (flat_interest | diminishing),
principal, interest_rate (default 0.05), term_months,
start_date, end_date, disbursed_at,
status (active | paid | defaulted),
signwell_document_id, contract_url,
created_at, updated_at
```

### `loan_schedules`
```sql
id, loan_id, due_date, period_number,
principal_due, interest_due, total_due,
balance_after, status (pending | paid | late)
```

### `payments`
```sql
id, loan_id, schedule_id (nullable),
amount_paid, paid_at, payment_type (interest | principal | penalty | full),
late_days, penalty_amount, remarks, created_at
```

### `bank_transactions`
```sql
id, transaction_date, description, amount, type (credit | debit),
balance, source (gotyme_import | manual), reference_no, created_at
```

### `fund_summary` (computed view or materialized)
```sql
total_stash, total_loaned_out, total_collected_interest,
total_penalties, total_dividends_paid, current_balance
```

---

## Project Structure

```
mfk-lending/
├── app/
│   ├── (auth)/
│   │   └── login/
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   ├── page.tsx                  # Dashboard overview
│   │   ├── loans/
│   │   │   ├── page.tsx              # All loans list
│   │   │   ├── new/page.tsx          # Create loan + generate contract
│   │   │   └── [id]/page.tsx         # Loan detail + payment history
│   │   ├── borrowers/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── stash/
│   │   │   └── page.tsx              # Monthly contributions tracker
│   │   ├── transactions/
│   │   │   └── page.tsx              # Bank transaction log
│   │   └── reports/
│   │       └── page.tsx              # Gains, distributions, summaries
│   └── api/
│       ├── reminders/route.ts        # Cron-triggered payment reminders
│       ├── contracts/generate/route.ts
│       └── webhooks/signwell/route.ts
├── components/
│   ├── loans/
│   │   ├── LoanCard.tsx
│   │   ├── PaymentScheduleTable.tsx
│   │   └── LoanForm.tsx
│   ├── stash/
│   │   └── ContributionGrid.tsx
│   └── ui/                           # shadcn/ui components
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   └── server.ts
│   ├── finance/
│   │   ├── flat-interest.ts          # Flat interest calculations
│   │   ├── diminishing.ts            # Diminishing balance amortization
│   │   └── penalties.ts             # Late payment penalty calculations
│   ├── contracts/
│   │   └── generator.ts             # PDF contract generation
│   ├── notifications/
│   │   ├── email.ts                 # Resend integration
│   │   └── sms.ts                   # Semaphore integration
│   └── signwell/
│       └── client.ts
├── types/
│   └── index.ts
└── CLAUDE.md
```

---

## Key Features to Build

### 1. Dashboard
- Total fund value (stash + earned interest − dividends − loans outstanding)
- Active loans count and total amount
- Overdue payments alert
- Monthly cash flow chart
- Per-partner stash contribution status

### 2. Loan Management
- Create loan (choose type: flat or diminishing)
- Auto-generate amortization/payment schedule on creation
- Track payment status per period
- Flag overdue payments, auto-calculate penalties (1%/day on accrued interest)
- Loan status badges: Active / Paid / Defaulted / Overdue

### 3. Contract Generation
- Pre-fill contract PDF from loan + borrower data
- Send via SignWell API for e-signature
- Webhook to update contract status when signed
- Store signed PDF in Supabase Storage

### 4. Automated Reminders
- Vercel Cron: run daily (or 3 days before due date)
- Send email via Resend + SMS via Semaphore (Philippine carrier)
- Reminder template: borrower name, due date, amount due, MFK payment account
- Escalation: mark overdue + notify partners if unpaid after due date

### 5. Stash Tracker
- Monthly contribution grid (Frank / Kim / Francis × month)
- Mark paid/unpaid per month per partner
- Track irregular payments with remarks
- Running total per partner and grand total

### 6. Reports & Summaries
- Gains report: total interest earned per period
- Dividend distribution calculator and history
- Loan book: all loans, grouped by status
- Partner equity report (stash contributed vs. dividends received)
- Bank interest earned (from GoTyme)

### 7. GoTyme Bank Integration (Phase 2)
- Manual CSV import of bank statements initially
- Map transactions to loan payments or stash contributions
- Reconcile expected vs. actual payments
- Future: GoTyme API if/when available

---

## Financial Calculations Reference

### Flat Interest (Monthly Interest Loan)
```typescript
// Monthly interest payment
monthlyInterest = principal * interestRate  // e.g., 30000 * 0.05 = 1500

// Total repayment at end of term
totalRepayment = principal + (monthlyInterest * termMonths)

// Late payment penalty
penalty = (daysLate * 0.01) * monthlyInterest
```

### Diminishing Balance
```typescript
// Each month:
interest = remainingBalance * interestRate
principalPayment = monthlyPayment - interest
remainingBalance = remainingBalance - principalPayment

// Monthly payment (standard amortization formula)
monthlyPayment = principal * (r * (1+r)^n) / ((1+r)^n - 1)
// where r = monthly rate, n = number of periods
```

---

## MCP Servers (Recommended)

### Development
| MCP Server | Purpose |
|---|---|
| **Supabase MCP** | Query and manage Supabase DB directly from Claude |
| **GitHub MCP** | Commit, PR, and branch management |
| **Vercel MCP** | Deployment status, environment variables |
| **Filesystem MCP** | Read/write project files locally |

### Productivity & Communication
| MCP Server | Purpose |
|---|---|
| **Resend MCP** | Preview and send transactional emails |
| **Slack MCP** | Internal partner notifications (optional) |
| **Google Drive MCP** | Access existing spreadsheet records during migration |

### Data
| MCP Server | Purpose |
|---|---|
| **PostgreSQL MCP** | Direct SQL queries to Supabase Postgres |
| **Browser/Puppeteer MCP** | Scrape GoTyme statements if no API (Phase 2) |

---

## Useful Claude Skills for This Project

| Skill | Use Case |
|---|---|
| `docx` | Generate/read loan contract Word templates |
| `pdf` | Create PDF contracts from HTML/data |
| `xlsx` | Import existing stash/lending spreadsheet data |
| `frontend-design` | Build polished Next.js UI components |
| `product-self-knowledge` | Reference Anthropic API for in-app AI features |

---

## Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# SignWell
SIGNWELL_API_KEY=

# Resend (email)
RESEND_API_KEY=
RESEND_FROM_EMAIL=

# Semaphore (PH SMS)
SEMAPHORE_API_KEY=
SEMAPHORE_SENDER_NAME=MFKLending

# App
NEXT_PUBLIC_APP_URL=
CRON_SECRET=
```

---

## Data Migration Plan

Existing data from the Google Sheet (CSV export) needs to be seeded into Supabase:

1. **Stash tab** → `contributions` table (Frank/Kim/Francis, Oct 2022–Mar 2026)
2. **Lending tab** → `borrowers` + `loans` + `payments` tables
3. **Summary tab** → `bank_transactions` + manual `dividends` entries
4. **AHA-Diminishing tab** → `loans` (type: diminishing) + `loan_schedules` + `payments`
5. **VZ-Diminishing tab** → same as above for Vanessa Zambas

Create a seed script at `scripts/seed.ts` that reads the CSV and inserts records.

---

## Contract Template Fields

Based on the signed Melca Ybañez agreement:

| Field | Source |
|---|---|
| Full Name | `borrowers.full_name` |
| Age | `borrowers.age` |
| Occupation | `borrowers.occupation` |
| Contact Number | `borrowers.phone` |
| Email | `borrowers.email` |
| Loan Purpose | `loans.purpose` |
| Initial Loan Amount | `loans.principal` |
| Bank | `borrowers.bank_name` |
| Account Name | `borrowers.account_name` |
| Account Number | `borrowers.account_number` |
| Monthly Interest Rate | `loans.interest_rate` (default 5%) |
| Loan Term | `loans.term_months` |
| Total Repayment | computed |
| Date | contract generation date |

MFK collection account is static:
- Bank: GoTyme Bank
- Account Name: MFK Lending Corp
- Account Number: 014721202843

---

## Notes & Gotchas

### Next.js 15 Specifics
- **`params` and `searchParams` are async** — always `await params` in page components and route handlers:
  ```typescript
  // app/(dashboard)/loans/[id]/page.tsx
  export default async function LoanPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    // ...
  }
  ```
- **`fetch` is NOT cached by default** — explicitly opt into caching with `{ cache: 'force-cache' }` or revalidation with `{ next: { revalidate: 60 } }`. For financial data, the default (no cache) is correct behavior.
- **React 19** is the peer dependency — use the `use()` hook for reading promises in client components, and lean on native form actions with `useActionState` instead of third-party form libraries where possible.
- **Turbopack** is the default dev server (`next dev`) — do not pass `--turbopack` manually, it's implicit. Some webpack-specific plugins may not be compatible; check before adding deps.
- **`cookies()` and `headers()`** from `next/headers` are now async — always `await` them in Server Components and Route Handlers.

- **Currency**: Always store amounts in centavos (integer) in DB to avoid floating point errors. Display as ₱ with `Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' })`
- **Timezone**: Philippines is UTC+8. Use `Asia/Manila` for all date/time operations. Store timestamps in UTC in Supabase.
- **SMS**: Semaphore is the most reliable Philippine bulk SMS provider. Register sender name as "MFKLending" (max 11 chars).
- **GoTyme**: No public API as of 2026. Use CSV import as primary data entry method.
- **SignWell**: Free tier supports up to 3 documents/month. Upgrade if volume increases.
- **Loan status colors** (from spreadsheet): gray = paid, colored = active. Replicate with status badges in UI.
- **Penalty calculation**: 1% per day applies to the *accrued interest amount* (not the principal).
- **Stash irregularities**: Some months have lump-sum catch-up payments — the `remarks` field must be preserved.
