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

#### 2. Diminishing Balance Loan (Standard)

- Monthly payment reduces outstanding principal
- Interest is recalculated on the **remaining balance** each month
- Two known borrowers: Al Huber Allere (AHA) and Vanessa Zambas (VZ)
- Payment schedule is tracked separately per borrower

#### 3. Hybrid Diminishing Loan

- Starts as a flat interest loan — borrower pays interest only each month
- Principal is returned in **irregular partial chunks** at the borrower's discretion
- Interest is recalculated on the **remaining balance** after each partial return
- No fixed amortization schedule — principal returns are ad hoc
- Example: Gesan — ₱200,000 loan, partial returns of ₱5,000 at a time
- Identified in the sheet by multiple `----PRINCIPAL RETURNED PHP {amount} {date}----` markers
- Outstanding balance = original principal − sum of all partial returns
- Status = active if outstanding balance > 0, paid if outstanding balance = 0
- `loan_type` stored as `hybrid_diminishing` in the database

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

| Layer            | Technology                                                          |
| ---------------- | ------------------------------------------------------------------- |
| Frontend         | Next.js 15 (App Router, Turbopack)                                  |
| Styling          | Tailwind CSS v4 + shadcn/ui                                         |
| Backend          | Next.js 15 Server Actions / Route Handlers                          |
| Database         | Supabase (PostgreSQL)                                               |
| Auth             | Supabase Auth                                                       |
| File Storage     | Supabase Storage (for contracts)                                    |
| Server State     | TanStack Query v5 (caching, background refetch, optimistic updates) |
| Client State     | Zustand v5 (UI state, multi-step forms, sidebar, filters)           |
| PDF Generation   | `@react-pdf/renderer`                                               |
| Email/SMS        | Resend (email) + Semaphore (PH SMS)                                 |
| E-Signature      | SignWell API                                                        |
| Scheduling       | Vercel Cron Jobs                                                    |
| Error Monitoring | Sentry (errors, performance, session replay)                        |
| Deployment       | Vercel                                                              |

### State Management Boundaries

Understanding what goes where prevents over-engineering:

**TanStack Query** — owns all data that comes from or goes to Supabase:

- Loan lists, borrower profiles, payment schedules, stash contributions
- Caches server responses and keeps them fresh in the background
- Handles optimistic updates when recording payments (update UI before server confirms)
- Invalidates related queries after a mutation (e.g., recording a payment invalidates
  the loan detail query and the dashboard summary query)
- Use `queryOptions()` pattern to colocate query keys and fetcher functions

**Zustand** — owns ephemeral UI state that does not need to be persisted:

- Multi-step loan creation form state (current step, form values across steps)
- Sidebar open/closed state on mobile
- Active filter selections on the loans list (status, type, search term)
- Dialog open/closed state when it needs to be controlled from outside the dialog
- Do NOT put server data in Zustand — that belongs in TanStack Query

**React `useState`** — for purely local, single-component state:

- Input focus, hover states, toggle within a single component
- Anything that does not need to be shared between components

**Server Actions + `useActionState`** — for form mutations:

- All create/update/delete operations go through Server Actions
- TanStack Query `invalidateQueries` is called after a successful mutation

### TanStack Query Setup

Wrap the dashboard layout with a QueryClientProvider in a 'use client' component:

```typescript
// src/components/providers/QueryProvider.tsx
'use client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,       // 1 minute
        gcTime: 5 * 60 * 1000,      // 5 minutes garbage collection
        retry: 1,
        refetchOnWindowFocus: true,
      },
    },
  }))
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
```

Install React Query Devtools for development only: `@tanstack/react-query-devtools`

### Zustand Store Structure

One store per domain — never one global store:

```
src/stores/
  loan-form.store.ts   — multi-step loan creation state
  ui.store.ts          — sidebar, modals, global UI state
  filters.store.ts     — loan list and borrower list filter state
```

### Query Key Conventions

Define all query keys as constants in src/lib/query-keys.ts:

```typescript
export const queryKeys = {
  loans: {
    all: ["loans"] as const,
    lists: () => [...queryKeys.loans.all, "list"] as const,
    list: (filters: LoanFilters) =>
      [...queryKeys.loans.lists(), filters] as const,
    detail: (id: string) => [...queryKeys.loans.all, "detail", id] as const,
  },
  borrowers: {
    all: ["borrowers"] as const,
    lists: () => [...queryKeys.borrowers.all, "list"] as const,
    detail: (id: string) => [...queryKeys.borrowers.all, "detail", id] as const,
  },
  stash: {
    all: ["stash"] as const,
    contributions: () => [...queryKeys.stash.all, "contributions"] as const,
    dividends: () => [...queryKeys.stash.all, "dividends"] as const,
    summary: () => [...queryKeys.stash.all, "summary"] as const,
  },
  dashboard: {
    all: ["dashboard"] as const,
    summary: () => [...queryKeys.dashboard.all, "summary"] as const,
    cashflow: (months: number) =>
      [...queryKeys.dashboard.all, "cashflow", months] as const,
  },
};
```

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
id, borrower_id, loan_type (flat_interest | diminishing | hybrid_diminishing),
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

### `principal_returns`

```sql
id, loan_id, amount, returned_at, remarks, created_at
```

Tracks each partial principal return for hybrid_diminishing loans.
Outstanding balance = loans.principal - SUM(principal_returns.amount) for that loan.

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
monthlyInterest = principal * interestRate; // e.g., 30000 * 0.05 = 1500

// Total repayment at end of term
totalRepayment = principal + monthlyInterest * termMonths;

// Late payment penalty
penalty = daysLate * 0.01 * monthlyInterest;
```

### Diminishing Balance (Standard)

```typescript
// Each month:
interest = remainingBalance * interestRate;
principalPayment = monthlyPayment - interest;
remainingBalance = remainingBalance - principalPayment;

// Monthly payment (standard amortization formula)
monthlyPayment = (principal * ((r * (1 + r)) ^ n)) / ((1 + r) ^ (n - 1));
// where r = monthly rate, n = number of periods
```

### Hybrid Diminishing (Irregular Principal Returns)

```typescript
// Interest each month is on the current outstanding balance
interest = outstandingBalance * interestRate;

// When a partial return is recorded:
outstandingBalance = outstandingBalance - partialReturnAmount;

// Outstanding balance at any point:
outstandingBalance = originalPrincipal - SUM(allPrincipalReturns);

// Loan is fully paid when:
outstandingBalance === 0;
```

---

## MCP Servers (Recommended)

### Development

| MCP Server         | Purpose                                           |
| ------------------ | ------------------------------------------------- |
| **Supabase MCP**   | Query and manage Supabase DB directly from Claude |
| **GitHub MCP**     | Commit, PR, and branch management                 |
| **Vercel MCP**     | Deployment status, environment variables          |
| **Filesystem MCP** | Read/write project files locally                  |

### Productivity & Communication

| MCP Server           | Purpose                                              |
| -------------------- | ---------------------------------------------------- |
| **Resend MCP**       | Preview and send transactional emails                |
| **Slack MCP**        | Internal partner notifications (optional)            |
| **Google Drive MCP** | Access existing spreadsheet records during migration |

### Data

| MCP Server                | Purpose                                      |
| ------------------------- | -------------------------------------------- |
| **PostgreSQL MCP**        | Direct SQL queries to Supabase Postgres      |
| **Browser/Puppeteer MCP** | Scrape GoTyme statements if no API (Phase 2) |

---

## Useful Claude Skills for This Project

| Skill                    | Use Case                                       |
| ------------------------ | ---------------------------------------------- |
| `docx`                   | Generate/read loan contract Word templates     |
| `pdf`                    | Create PDF contracts from HTML/data            |
| `xlsx`                   | Import existing stash/lending spreadsheet data |
| `frontend-design`        | Build polished Next.js UI components           |
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

## CSV Import Feature

During the transition from Google Sheets to the system, the sheet remains the
**source of truth**. Partners import data from CSV exports on demand. The DB is
a verified replica of the sheet until partners are confident enough to fully cut over.

Only **automated reminders** run live against the DB during transition.

### Import page

Location: `/dashboard/import` (visible to all partners during transition)

Supported import types — one per sheet tab:
| Import Type | Source Tab | Target Tables |
|---|---|---|
| Stash | Stash tab | `contributions` |
| Lending | Lending tab | `borrowers`, `loans`, `loan_schedules`, `payments`, `principal_returns` |
| Diminishing | AHA / VZ tabs | `borrowers`, `loans`, `loan_schedules`, `payments` |
| Summary | Summary tab | `bank_transactions`, `dividends` |

### Import workflow

1. Partner selects import type
2. Uploads CSV file
3. System parses and validates — shows preview table
4. Validation errors shown inline (unknown borrower, duplicate month, bad amount)
5. Partner reviews and confirms
6. Data inserted idempotently — re-importing same data skips duplicates
7. Import log entry created with timestamp, rows imported, rows skipped

### Lending tab parser rules

**Loan block detection:**

- Each loan block starts with a borrower name row (standalone text, no amount)
- Block ends when the next borrower name row is detected

**Row types within a block:**

```
[MONTH] [AMOUNT]                              → monthly interest payment
----PRINCIPAL RETURNED {date}----             → full principal return (flat loan)
----PRINCIPAL RETURNED PHP {amount} {date}--- → partial principal return (hybrid)
```

**Loan type classification:**

```
One PRINCIPAL RETURNED row, no amount   → flat_interest
One PRINCIPAL RETURNED row, amount = principal  → flat_interest (paid)
Multiple PRINCIPAL RETURNED rows        → hybrid_diminishing
No PRINCIPAL RETURNED row              → flat_interest (still active)
```

**Status derivation (CSV — no color available):**

```
outstandingBalance = principal - SUM(all partial return amounts)
outstandingBalance === 0 → status: paid
outstandingBalance  > 0 → status: active
```

**Interest calculation for hybrid_diminishing:**

```
Before first partial return:  interest = originalPrincipal × rate
After each partial return:    remainingBalance -= returnAmount
                              interest = remainingBalance × rate
```

**PRINCIPAL RETURNED regex patterns:**

```typescript
// Full return (no amount):
/^-+PRINCIPAL RETURNED\s+(\d{2}\/\d{2}\/\d{2,4})-+$/i

// Partial return (with amount):
/^-+PRINCIPAL RETURNED\s+PHP\s+([\d,]+(?:\.\d{2})?)\s+(\d{2}\/\d{2}\/\d{2,4})-+$/i
```

### Transition verification screen

Location: `/dashboard/import/verify`

Compares DB totals against known expected values:

- Total stash = ₱333,000 ✓/✗
- Grand total contributions per partner = ₱111,000 each ✓/✗
- Active loan count vs expected ✓/✗
- Per-borrower outstanding balance ✓/✗
- Any loans with unmatched interest payment counts ✓/✗

Partners must sign off on verification before reminders are enabled.

### Reminders toggle

Each loan has a `reminders_enabled` boolean field.
Reminders only fire for loans where `reminders_enabled = true`.
Partners enable reminders per loan after verifying the loan data is correct.

## Contract Template Fields

## Contract Template Fields

Based on the signed Melca Ybañez agreement:

| Field                 | Source                             |
| --------------------- | ---------------------------------- |
| Full Name             | `borrowers.full_name`              |
| Age                   | `borrowers.age`                    |
| Occupation            | `borrowers.occupation`             |
| Contact Number        | `borrowers.phone`                  |
| Email                 | `borrowers.email`                  |
| Loan Purpose          | `loans.purpose`                    |
| Initial Loan Amount   | `loans.principal`                  |
| Bank                  | `borrowers.bank_name`              |
| Account Name          | `borrowers.account_name`           |
| Account Number        | `borrowers.account_number`         |
| Monthly Interest Rate | `loans.interest_rate` (default 5%) |
| Loan Term             | `loans.term_months`                |
| Total Repayment       | computed                           |
| Date                  | contract generation date           |

MFK collection account is static:

- Bank: GoTyme Bank
- Account Name: MFK Lending Corp
- Account Number: 014721202843

---

## Sentry Integration

Sentry is used for error monitoring, performance tracing, and session replay across
the entire MFK Lending app. Because this is a financial tool, all unhandled errors
and slow transactions must be captured and alerted on.

### What to monitor

| Layer             | What Sentry captures                                            |
| ----------------- | --------------------------------------------------------------- |
| Server Components | Unhandled exceptions during data fetching                       |
| Server Actions    | Failures in createLoan, recordPayment, createBorrower           |
| Route Handlers    | Errors in /api/reminders, /api/webhooks/signwell                |
| Client Components | React render errors via Error Boundaries                        |
| Finance Engine    | Manually logged calculation errors (should never throw in prod) |
| TanStack Query    | Query errors surfaced to the user                               |
| Performance       | Slow DB queries, slow Server Actions, slow page loads           |

### Installation

```bash
npx @sentry/wizard@latest -i nextjs
```

The wizard handles:

- Installing `@sentry/nextjs`
- Creating `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`
- Wrapping `next.config.ts` with `withSentryConfig`
- Creating `src/app/global-error.tsx` (Sentry-aware global error boundary)

### Environment variables

```env
# Sentry
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_ORG=
SENTRY_PROJECT=
SENTRY_AUTH_TOKEN=        # For source map uploads (Vercel build only)
```

`NEXT_PUBLIC_SENTRY_DSN` is safe to expose — it is a public ingest URL.
`SENTRY_AUTH_TOKEN` must NEVER be prefixed with `NEXT_PUBLIC_`. Add it to
Vercel environment variables for Production and Preview only, not Development.

### Configuration

**sentry.client.config.ts:**

```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.2 : 1.0,
  replaysSessionSampleRate: 0.1, // 10% of sessions
  replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors
  integrations: [
    Sentry.replayIntegration({
      maskAllText: true, // mask all text — borrower PII protection
      blockAllMedia: true,
    }),
  ],
});
```

**sentry.server.config.ts:**

```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.2 : 1.0,
});
```

### Manual error capture in Server Actions

All Server Actions that touch financial data must wrap their logic in a try/catch
and report unexpected errors to Sentry with context:

```typescript
import * as Sentry from "@sentry/nextjs";

export async function recordPayment(
  prevState: ActionState,
  formData: FormData,
) {
  try {
    // ... payment logic
  } catch (error) {
    Sentry.captureException(error, {
      tags: { action: "recordPayment" },
      extra: { loanId: formData.get("loanId") },
    });
    return actionError(
      "An unexpected error occurred. Our team has been notified.",
    );
  }
}
```

### Custom context — attach user identity

In the dashboard layout, set the Sentry user context after auth:

```typescript
// Server Component — get session
const {
  data: { user },
} = await supabase.auth.getUser();

// Client Component — set Sentry user
Sentry.setUser({ email: user?.email, id: user?.id });
```

Clear user on sign out: `Sentry.setUser(null)`

### Performance — instrument slow operations

Use Sentry spans to trace slow DB queries and finance calculations:

```typescript
const schedule = Sentry.startSpan(
  { name: "generateSchedule", op: "finance.calculate" },
  () => generateSchedule(params),
);
```

### PII and privacy rules

Because borrower data (names, account numbers, loan amounts) is sensitive:

- `maskAllText: true` in Session Replay — no text is visible in recordings
- `blockAllMedia: true` — no screenshots of sensitive content
- Do NOT pass borrower account numbers as Sentry extra/context
- Do NOT pass loan amounts as Sentry tags — use loan IDs only
- Sentry breadcrumbs automatically capture navigation — this is acceptable
- Review Sentry's data scrubbing rules in the project settings and add
  patterns for Philippine phone numbers and bank account numbers

### Alerts to configure in Sentry dashboard

| Alert                 | Condition                          | Notify via            |
| --------------------- | ---------------------------------- | --------------------- |
| Any new error         | First seen                         | Email to all partners |
| Error spike           | >10 errors/hour                    | Email + Slack         |
| Server Action failure | recordPayment or createLoan throws | Email immediately     |
| Slow transaction      | p95 > 3s on any Server Action      | Email                 |
| Cron job failure      | /api/reminders errors              | Email immediately     |

### Source maps

Source maps are uploaded to Sentry during Vercel builds via `SENTRY_AUTH_TOKEN`.
This means error stack traces in Sentry point to your original TypeScript source,
not the compiled output. Do not disable this — it is essential for debugging.

Add to .gitignore:
.sentryclirc

---

## Notes & Gotchas

### Next.js 15 Specifics

- **`params` and `searchParams` are async** — always `await params` in page components and route handlers:
  ```typescript
  // app/(dashboard)/loans/[id]/page.tsx
  export default async function LoanPage({
    params,
  }: {
    params: Promise<{ id: string }>;
  }) {
    const { id } = await params;
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
- **Penalty calculation**: 1% per day applies to the _accrued interest amount_ (not the principal).
- **Stash irregularities**: Some months have lump-sum catch-up payments — the `remarks` field must be preserved.
