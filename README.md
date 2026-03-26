# MFK Lending Corp

A full-stack lending management system for **MFK Lending Corporation** — a small Filipino co-op lending business run by three partners. The system handles everything from loan creation and contract generation to payment tracking, automated reminders, and partner fund management.

---

## Features

- **Loan Management** — Create and track flat-interest and diminishing-balance loans, with auto-generated payment schedules and overdue detection
- **Contract Generation** — Pre-filled PDF contracts sent via SignWell for e-signature, stored in Supabase
- **Automated Reminders** — Email and SMS notifications sent to borrowers before and after due dates via Vercel Cron
- **Stash Tracker** — Monthly contribution grid for all three partners, with running totals and dividend history
- **Reports & Summaries** — Interest earned, dividends distributed, partner equity, and loan book overviews
- **Bank Reconciliation** — Manual CSV import of GoTyme Bank statements to reconcile payments

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js 15](https://nextjs.org) (App Router, Turbopack) |
| Styling | [Tailwind CSS v4](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com) |
| Database | [Supabase](https://supabase.com) (PostgreSQL) |
| Auth | Supabase Auth |
| Storage | Supabase Storage |
| PDF | `@react-pdf/renderer` |
| Email | [Resend](https://resend.com) |
| SMS | [Semaphore](https://semaphore.co) (Philippine carrier) |
| E-Signature | [SignWell API](https://signwell.com) |
| Scheduling | Vercel Cron Jobs |
| Deployment | [Vercel](https://vercel.com) |

---

## Getting Started

### Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com) project
- A [Vercel](https://vercel.com) account (for deployment and cron jobs)
- API keys for Resend, Semaphore, and SignWell

### Installation

```bash
git clone https://github.com/your-org/mfk-lending.git
cd mfk-lending
npm install
```

### Environment Variables

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

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

### Database Setup

Run the migrations against your Supabase project:

```bash
npx supabase db push
```

To seed historical data from the existing spreadsheet:

```bash
npx tsx scripts/seed.ts
```

### Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Project Structure

```
mfk-lending/
├── app/
│   ├── (auth)/login/
│   ├── (dashboard)/
│   │   ├── page.tsx                  # Dashboard overview
│   │   ├── loans/                    # Loan list, create, detail
│   │   ├── borrowers/                # Borrower profiles
│   │   ├── stash/                    # Monthly contributions
│   │   ├── transactions/             # Bank transaction log
│   │   └── reports/                  # Gains & distributions
│   └── api/
│       ├── reminders/route.ts        # Cron-triggered reminders
│       ├── contracts/generate/route.ts
│       └── webhooks/signwell/route.ts
├── components/
│   ├── loans/
│   ├── stash/
│   └── ui/                           # shadcn/ui components
├── lib/
│   ├── supabase/
│   ├── finance/                      # Interest & penalty calculations
│   ├── contracts/                    # PDF generation
│   ├── notifications/                # Email + SMS
│   └── signwell/
├── scripts/
│   └── seed.ts                       # Historical data migration
└── types/
```

---

## Loan Types

### Flat Interest (Monthly Interest)
The borrower pays **interest only** each month, then repays the full principal at the end of the term.

```
Monthly interest  = Principal × 5%
Total repayment   = Principal + (Monthly interest × Term months)
Late penalty      = Days late × 1% × Monthly interest
```

*Example: ₱30,000 loan over 3 months → ₱1,500/month interest → ₱34,500 total*

### Diminishing Balance
Monthly payments reduce the outstanding principal. Interest is recalculated on the remaining balance each month using standard amortization.

```
Monthly payment = P × [r(1+r)ⁿ] / [(1+r)ⁿ − 1]
```

---

## Database Schema

| Table | Description |
|---|---|
| `partners` | Frank, Francis, Kim — the three co-op members |
| `contributions` | Monthly stash payments per partner |
| `dividends` | Yearly profit distributions per partner |
| `borrowers` | Loan applicant profiles and bank details |
| `loans` | Loan records with type, principal, term, and status |
| `loan_schedules` | Per-period payment schedule (principal + interest due) |
| `payments` | Recorded payments against loan schedules |
| `bank_transactions` | GoTyme Bank statement entries (imported or manual) |

---

## Automated Reminders

A Vercel Cron job runs daily and sends:
- A **reminder** 3 days before a payment is due
- An **overdue notice** the day after a missed payment, with accruing penalty info
- A **partner alert** if a loan remains unpaid beyond a configurable grace period

Notifications are sent via email (Resend) and SMS (Semaphore).

---

## Contract Generation

When a new loan is created:
1. A PDF contract is generated with all borrower and loan details pre-filled
2. The document is uploaded to SignWell and sent to the borrower's email for e-signature
3. A webhook from SignWell updates the loan record once signed
4. The completed contract is stored in Supabase Storage

---

## Data Migration

Existing records from the MFK Google Sheet are migrated via `scripts/seed.ts`:

| Sheet Tab | Target Tables |
|---|---|
| Stash | `contributions` |
| Lending | `borrowers`, `loans`, `payments` |
| Summary | `bank_transactions`, `dividends` |
| AHA-Diminishing | `loans`, `loan_schedules`, `payments` |
| VZ-Diminishing | `loans`, `loan_schedules`, `payments` |

---

## Development Notes

- **Next.js 15** — `params` and `searchParams` props in pages are now Promises; always `await` them. `fetch` is no longer cached by default — correct for financial data. `cookies()` and `headers()` from `next/headers` are also async.
- **React 19** — peer dependency of Next.js 15. Use `useActionState` for form handling and the `use()` hook for reading promises in Client Components.
- **Currency** is stored in centavos (integers) to avoid floating-point errors. Displayed using `Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' })`.
- **Timestamps** are stored in UTC in Supabase and converted to `Asia/Manila` (UTC+8) on display.
- **Penalty** of 1% per day applies to the accrued interest amount — not the principal.
- **GoTyme** has no public API. Bank data is ingested via CSV export until an API becomes available.

---

## License

Private — MFK Lending Corporation. All rights reserved.
