# Phase 5 — Contract Generation & E-Signature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the placeholder "Contract: Pending" badge on the loan detail page with a full PDF contract generation + SignWell e-signature workflow, including webhook handling and Supabase Storage for signed PDFs.

**Architecture:** Server Actions generate the PDF server-side using `@react-pdf/renderer` (never the browser), upload it to SignWell via REST API, and store it in a private Supabase Storage bucket. A webhook handler receives SignWell events (signed/declined/expired) and updates the loan record. The loan detail page and loans list both reflect the live contract status from the DB.

**Tech Stack:** `@react-pdf/renderer@4.3.2` (already installed), SignWell REST API, Supabase Storage (service role), Next.js 15 Server Actions, `crypto` (Node built-in for HMAC), Vitest for unit tests.

---

## IMPORTANT CODEBASE NOTES

- Route group is `(app)` not `(dashboard)` — pages live at `src/app/(app)/loans/[id]/page.tsx` and render at `/loans/[id]`
- Service role client: `createServiceRoleClient()` from `@/lib/supabase/service-role`
- Server client: `createClient()` (async) from `@/lib/supabase/server`
- Action pattern: `withSentry(actionName, fn)` from `@/lib/actions/with-sentry`
- All money in centavos; display via `formatPHP()` from `@/lib/utils/currency`
- Date formatting: `formatManila(date, fmt)` from `@/lib/utils/date`
- Latest migration timestamp: `20260401000002` → new ones use `20260402000001`, `20260402000002`
- `calcMonthlyInterest(principal, rate)` and `calcFlatTotalRepayment(principal, rate, termMonths)` live in `@/lib/finance` (re-exported from `@/lib/finance/index.ts`)

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `supabase/migrations/20260402000001_contract_status.sql` | Add contract columns + index to loans |
| Create | `supabase/migrations/20260402000002_storage_contracts.sql` | Create private contracts bucket |
| Modify | `src/types/index.ts` | Add ContractStatus, ContractData, SignWellWebhookPayload, update Loan |
| Create | `src/lib/signwell/client.ts` | SignWell REST API client + webhook validator |
| Create | `src/lib/signwell/__tests__/client.test.ts` | Unit tests for validateWebhookSignature |
| Create | `src/lib/contracts/ContractPDF.tsx` | React PDF component (server-side only) |
| Create | `src/lib/contracts/generator.ts` | generateContractPDF() + formatContractData() |
| Create | `src/lib/contracts/__tests__/generator.test.ts` | Unit tests for formatContractData() |
| Create | `src/lib/actions/contracts.ts` | generateAndSendContract, resendContract, getContractDownloadUrl |
| Create | `src/app/api/webhooks/signwell/route.ts` | POST webhook handler |
| Modify | `src/components/loans/LoanDetailClient.tsx` | Replace placeholder with ContractSection |
| Create | `src/components/loans/ContractSection.tsx` | Contract status UI component |
| Modify | `src/lib/data/loans-query.ts` | Add contract_status to SELECT |
| Modify | `src/types/index.ts` (Loan) | Add contract fields (done in Task 2) |
| Create | `src/app/(app)/loans/[id]/contract/page.tsx` | HTML contract preview page |
| Modify | `next.config.ts` | Add serverExternalPackages for @react-pdf/renderer |

---

## Task 1: Database Migrations

**Files:**
- Create: `supabase/migrations/20260402000001_contract_status.sql`
- Create: `supabase/migrations/20260402000002_storage_contracts.sql`

- [ ] **Step 1: Create contract_status migration**

```sql
-- supabase/migrations/20260402000001_contract_status.sql

ALTER TABLE loans
  ADD COLUMN IF NOT EXISTS contract_status text
    NOT NULL DEFAULT 'none'
    CHECK (contract_status IN ('none', 'pending_signature', 'signed', 'declined', 'expired')),
  ADD COLUMN IF NOT EXISTS contract_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS contract_signed_at timestamptz,
  ADD COLUMN IF NOT EXISTS contract_signed_pdf_path text;

-- signwell_document_id and contract_url already exist from Phase 0 migrations

-- Index for fast webhook lookups by signwell_document_id
CREATE INDEX IF NOT EXISTS idx_loans_signwell_document_id
  ON loans(signwell_document_id)
  WHERE signwell_document_id IS NOT NULL;
```

- [ ] **Step 2: Create storage bucket migration**

```sql
-- supabase/migrations/20260402000002_storage_contracts.sql

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'contracts',
  'contracts',
  false,
  10485760,
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload contracts"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'contracts');

CREATE POLICY "Authenticated users can read contracts"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'contracts');

CREATE POLICY "Service role manages contracts"
  ON storage.objects FOR ALL TO service_role
  USING (bucket_id = 'contracts');
```

- [ ] **Step 3: Push migrations**

```bash
npx supabase db push
```

Expected: both migrations run with no errors. Verify with:
```bash
npx supabase db diff
```
Expected: no pending changes.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/
git commit -m "feat: add contract_status columns to loans + contracts storage bucket"
```

---

## Task 2: TypeScript Types

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: Add ContractStatus type after LoanStatus**

In `src/types/index.ts`, after the `LoanStatus` line (line 5), add:

```typescript
export type ContractStatus =
  | 'none'
  | 'pending_signature'
  | 'signed'
  | 'declined'
  | 'expired'
```

- [ ] **Step 2: Add contract fields to the Loan interface**

In the `Loan` interface (around line 62), add these fields after `reminders_enabled`:

```typescript
  contract_status: ContractStatus
  contract_sent_at: string | null
  contract_signed_at: string | null
  contract_signed_pdf_path: string | null
```

- [ ] **Step 3: Add ContractData interface**

After the `PartnerEscalation` interface at the end of the file, add:

```typescript
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
  mfkBankName: string        // 'GoTyme Bank'
  mfkAccountName: string     // 'MFK Lending Corp'
  mfkAccountNumber: string   // '014721202843'

  // Document metadata
  documentDate: string       // formatted: 'March 25, 2026'
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
```

- [ ] **Step 4: Verify types compile**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 5: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add ContractStatus, ContractData, SignWellWebhookPayload types"
```

---

## Task 3: SignWell Client (TDD)

**Files:**
- Create: `src/lib/signwell/__tests__/client.test.ts`
- Create: `src/lib/signwell/client.ts`

- [ ] **Step 1: Write failing tests first**

Create `src/lib/signwell/__tests__/client.test.ts`:

```typescript
import crypto from 'node:crypto'
import { describe, it, expect, beforeEach, vi } from 'vitest'

// We test validateWebhookSignature by mocking env var
const testSecret = 'test-webhook-secret'
const testPayload = JSON.stringify({ event: 'document_completed', document: { id: 'doc-123' } })
const validSig = crypto
  .createHmac('sha256', testSecret)
  .update(testPayload)
  .digest('hex')

describe('validateWebhookSignature', () => {
  beforeEach(() => {
    vi.stubEnv('SIGNWELL_WEBHOOK_SECRET', testSecret)
  })

  it('returns true for a valid signature', async () => {
    const { validateWebhookSignature } = await import('../client')
    expect(validateWebhookSignature(testPayload, validSig)).toBe(true)
  })

  it('returns false for an invalid signature', async () => {
    const { validateWebhookSignature } = await import('../client')
    expect(validateWebhookSignature(testPayload, 'badsignature')).toBe(false)
  })

  it('returns false when payload is tampered', async () => {
    const { validateWebhookSignature } = await import('../client')
    const tamperedPayload = testPayload + 'tampered'
    expect(validateWebhookSignature(tamperedPayload, validSig)).toBe(false)
  })

  it('returns false when signature is empty string', async () => {
    const { validateWebhookSignature } = await import('../client')
    expect(validateWebhookSignature(testPayload, '')).toBe(false)
  })

  it('returns false when SIGNWELL_WEBHOOK_SECRET is not set', async () => {
    vi.stubEnv('SIGNWELL_WEBHOOK_SECRET', '')
    const { validateWebhookSignature } = await import('../client')
    expect(validateWebhookSignature(testPayload, validSig)).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/lib/signwell/__tests__/client.test.ts
```

Expected: FAIL — module not found or function undefined.

- [ ] **Step 3: Implement the SignWell client**

Create `src/lib/signwell/client.ts`:

```typescript
/**
 * SignWell API client for MFK Lending Corp.
 * SERVER-SIDE ONLY — never import in client components.
 *
 * API base: https://www.signwell.com/api/v1
 * Auth: Authorization: Token token={SIGNWELL_API_KEY}
 */
import crypto from 'node:crypto'

const SIGNWELL_API_KEY = process.env.SIGNWELL_API_KEY
const SIGNWELL_WEBHOOK_SECRET = process.env.SIGNWELL_WEBHOOK_SECRET
const SIGNWELL_BASE_URL = 'https://www.signwell.com/api/v1'

// ─── Types ────────────────────────────────────────────────────────────────────

export type SignWellResult<T> =
  | { success: true; data: T }
  | { success: false; error: string }

export interface CreateDocumentParams {
  name: string
  pdfBase64: string
  signerName: string
  signerEmail: string
  reminderDays?: number
  expiryDays?: number
}

export interface SignWellDocument {
  id: string
  status: string
  signingUrl: string
  expiresAt: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getApiKey(): string {
  if (!SIGNWELL_API_KEY) throw new Error('SIGNWELL_API_KEY is not set')
  return SIGNWELL_API_KEY
}

function authHeader(): Record<string, string> {
  return {
    Authorization: `Token token=${getApiKey()}`,
    'Content-Type': 'application/json',
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Creates a document in SignWell and sends it to the signer.
 * Uses test_mode=1 in development to avoid consuming quota.
 */
export async function createAndSendDocument(
  params: CreateDocumentParams
): Promise<SignWellResult<SignWellDocument>> {
  try {
    const isProduction = process.env.NODE_ENV === 'production'
    const body = {
      document: {
        name: params.name,
        files: [
          {
            name: 'loan-agreement.pdf',
            file_base64: params.pdfBase64,
          },
        ],
        recipients: [
          {
            id: '1',
            name: params.signerName,
            email: params.signerEmail,
            placeholder_name: 'Borrower',
          },
        ],
        reminder_days: params.reminderDays ?? 3,
        expiration_days: params.expiryDays ?? 30,
        test_mode: isProduction ? 0 : 1,
      },
    }

    const response = await fetch(`${SIGNWELL_BASE_URL}/documents`, {
      method: 'POST',
      headers: authHeader(),
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const text = await response.text()
      return { success: false, error: `SignWell API error ${response.status}: ${text}` }
    }

    const data = await response.json()
    const doc = data.document ?? data

    return {
      success: true,
      data: {
        id: doc.id,
        status: doc.status,
        signingUrl: doc.signing_url ?? doc.recipients?.[0]?.signing_url ?? '',
        expiresAt: doc.expires_at ?? '',
      },
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return { success: false, error: `createAndSendDocument failed: ${message}` }
  }
}

/**
 * Fetches a document record from SignWell by ID.
 */
export async function getDocument(
  documentId: string
): Promise<SignWellResult<SignWellDocument>> {
  try {
    const response = await fetch(`${SIGNWELL_BASE_URL}/documents/${documentId}`, {
      headers: authHeader(),
    })

    if (!response.ok) {
      const text = await response.text()
      return { success: false, error: `SignWell getDocument error ${response.status}: ${text}` }
    }

    const data = await response.json()
    const doc = data.document ?? data

    return {
      success: true,
      data: {
        id: doc.id,
        status: doc.status,
        signingUrl: doc.signing_url ?? '',
        expiresAt: doc.expires_at ?? '',
      },
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return { success: false, error: `getDocument failed: ${message}` }
  }
}

/**
 * Downloads the completed (signed) PDF from SignWell.
 * Returns the PDF content as a Buffer.
 */
export async function downloadSignedPDF(documentId: string): Promise<SignWellResult<Buffer>> {
  try {
    const response = await fetch(
      `${SIGNWELL_BASE_URL}/documents/${documentId}/completed_pdf`,
      { headers: authHeader() }
    )

    if (!response.ok) {
      const text = await response.text()
      return { success: false, error: `SignWell downloadSignedPDF error ${response.status}: ${text}` }
    }

    const arrayBuffer = await response.arrayBuffer()
    return { success: true, data: Buffer.from(arrayBuffer) }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return { success: false, error: `downloadSignedPDF failed: ${message}` }
  }
}

/**
 * Validates that a SignWell webhook payload matches its HMAC-SHA256 signature.
 * Uses SIGNWELL_WEBHOOK_SECRET (separate from API key).
 * Uses timing-safe comparison to prevent timing attacks.
 */
export function validateWebhookSignature(
  payload: string,
  signatureHeader: string
): boolean {
  if (!SIGNWELL_WEBHOOK_SECRET || !signatureHeader) return false
  try {
    const expectedSig = crypto
      .createHmac('sha256', SIGNWELL_WEBHOOK_SECRET)
      .update(payload)
      .digest('hex')

    // Pad to same length if needed to avoid length-based timing leak
    const expected = Buffer.from(expectedSig)
    const received = Buffer.from(signatureHeader)

    if (expected.length !== received.length) return false
    return crypto.timingSafeEqual(expected, received)
  } catch {
    return false
  }
}
```

- [ ] **Step 4: Run tests — must pass**

```bash
npx vitest run src/lib/signwell/__tests__/client.test.ts
```

Expected: 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/signwell/
git commit -m "feat: SignWell API client with webhook signature validation"
```

---

## Task 4: PDF Generator

**Files:**
- Create: `src/lib/contracts/ContractPDF.tsx`
- Create: `src/lib/contracts/generator.ts`

Note: `ContractPDF.tsx` is SERVER-SIDE ONLY. Never import from client components.

- [ ] **Step 1: Create ContractPDF.tsx**

Create `src/lib/contracts/ContractPDF.tsx`:

```tsx
/**
 * MFK Lending Corporation loan agreement PDF template.
 * SERVER-SIDE ONLY — uses @react-pdf/renderer which must not run in the browser.
 * Matches the Melca Ybañez agreement layout.
 */
import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import type { ContractData } from '@/types'

// ─── Formatting helpers (no Intl in react-pdf environment) ────────────────────

function formatPHP(centavos: number): string {
  const pesos = centavos / 100
  return `₱${pesos.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    paddingTop: 40,
    paddingBottom: 40,
    paddingLeft: 40,
    paddingRight: 40,
    backgroundColor: '#ffffff',
    lineHeight: 1.4,
  },
  // Header
  header: {
    alignItems: 'center',
    marginBottom: 8,
  },
  headerBrand: {
    fontSize: 28,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 4,
    color: '#1a1a2e',
  },
  headerSub: {
    fontSize: 9,
    letterSpacing: 3,
    color: '#444',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  divider: {
    borderBottomWidth: 1.5,
    borderBottomColor: '#1a1a2e',
    marginVertical: 8,
  },
  thinDivider: {
    borderBottomWidth: 0.5,
    borderBottomColor: '#cccccc',
    marginVertical: 6,
  },
  // Title
  title: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#1a1a2e',
  },
  // Body
  intro: {
    fontSize: 9,
    textAlign: 'justify',
    marginBottom: 10,
    color: '#333',
  },
  // Sections
  sectionHeading: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 5,
    marginTop: 8,
    color: '#1a1a2e',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  label: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    width: 110,
    color: '#333',
  },
  value: {
    fontSize: 9,
    flex: 1,
    color: '#111',
  },
  paragraph: {
    fontSize: 9,
    marginBottom: 4,
    textAlign: 'justify',
    color: '#333',
    lineHeight: 1.5,
  },
  // Highlighted rows (yellow background)
  highlighted: {
    backgroundColor: '#fffde7',
    padding: 4,
    marginBottom: 4,
    borderRadius: 2,
  },
  highlightedBold: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'justify',
    lineHeight: 1.5,
  },
  // Boxed section (MFK bank account)
  box: {
    borderWidth: 1,
    borderColor: '#1a1a2e',
    padding: 8,
    marginVertical: 6,
    alignItems: 'center',
  },
  boxText: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    marginBottom: 2,
    color: '#1a1a2e',
  },
  // Italic helper
  italic: {
    fontSize: 8,
    fontFamily: 'Helvetica-Oblique',
    color: '#555',
    marginTop: 3,
  },
  // Signature block
  signatureSection: {
    marginTop: 20,
    paddingTop: 12,
    borderTopWidth: 0.5,
    borderTopColor: '#cccccc',
  },
  signatureText: {
    fontSize: 9,
    textAlign: 'justify',
    marginBottom: 16,
    color: '#333',
  },
  signatureLine: {
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    width: 220,
    marginBottom: 3,
  },
  signatureLabel: {
    fontSize: 8,
    color: '#666',
    marginBottom: 12,
  },
  docId: {
    fontSize: 7,
    color: '#aaa',
    marginTop: 10,
    textAlign: 'center',
  },
})

// ─── Component ────────────────────────────────────────────────────────────────

interface ContractPDFProps {
  data: ContractData
}

export function ContractPDF({ data }: ContractPDFProps) {
  const principalFormatted = formatPHP(data.principalCentavos)
  const monthlyInterestFormatted = formatPHP(data.monthlyInterestCentavos)
  const totalInterestFormatted = formatPHP(data.monthlyInterestCentavos * data.termMonths)
  const totalRepaymentFormatted = formatPHP(data.totalRepaymentCentavos)

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerBrand}>MFK</Text>
          <Text style={styles.headerSub}>Lending Corp</Text>
        </View>
        <View style={styles.divider} />

        {/* Title */}
        <Text style={styles.title}>
          MFK Lending Corporation - Lending Agreement and Borrower Criteria
        </Text>

        {/* Intro */}
        <Text style={styles.intro}>
          This Lending Agreement ("Agreement") outlines the criteria and terms for borrowing from
          MFK Lending Corporation ("Lender"). Please read this Agreement carefully. By applying for
          and accepting a loan from MFK Lending Corporation, you acknowledge and agree to the
          following terms and conditions:
        </Text>

        {/* Section 1 — Personal Information */}
        <Text style={styles.sectionHeading}>1. Personal Information:</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Full Name:</Text>
          <Text style={styles.value}>{data.borrowerFullName}</Text>
          <Text style={styles.label}>Age:</Text>
          <Text style={styles.value}>{data.borrowerAge}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Occupation:</Text>
          <Text style={styles.value}>{data.borrowerOccupation}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Contact Number:</Text>
          <Text style={styles.value}>{data.borrowerPhone}</Text>
          <Text style={styles.label}>Email:</Text>
          <Text style={styles.value}>{data.borrowerEmail}</Text>
        </View>
        <View style={styles.thinDivider} />

        {/* Section 2 — Loan Application Requirements */}
        <Text style={styles.sectionHeading}>2. Loan Application Requirements:</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Loan Purpose:</Text>
          <Text style={styles.value}>{data.loanPurpose ?? '_______________'}</Text>
        </View>
        <View style={[styles.row, styles.highlighted]}>
          <Text style={styles.label}>Initial Loan Amount:</Text>
          <Text style={[styles.value, { fontFamily: 'Helvetica-Bold' }]}>{principalFormatted}</Text>
        </View>

        <Text style={[styles.paragraph, { fontFamily: 'Helvetica-Bold', marginTop: 4 }]}>
          Online Bank Account Information
        </Text>
        <View style={styles.row}>
          <Text style={styles.label}>Bank:</Text>
          <Text style={styles.value}>{data.borrowerBank}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Account Name:</Text>
          <Text style={styles.value}>{data.borrowerAccountName}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Account Number:</Text>
          <Text style={styles.value}>{data.borrowerAccountNumber}</Text>
        </View>
        <Text style={styles.italic}>
          Borrower must possess a valid online bank account for loan disbursement and repayment.
        </Text>
        <View style={styles.thinDivider} />

        {/* Section 3 — Loan Terms and Conditions */}
        <Text style={styles.sectionHeading}>3. Loan Terms and Conditions:</Text>
        <View style={styles.highlighted}>
          <Text style={styles.highlightedBold}>
            Monthly Interest: The interest on the outstanding loan balance is calculated at a rate
            of 5% per month, on the outstanding loan balance for a three-month loan term.
          </Text>
        </View>

        {/* MFK collection account box */}
        <View style={styles.box}>
          <Text style={styles.boxText}>Bank: {data.mfkBankName}</Text>
          <Text style={styles.boxText}>Account Name: {data.mfkAccountName}</Text>
          <Text style={styles.boxText}>Account Number: {data.mfkAccountNumber}</Text>
        </View>

        <View style={styles.highlighted}>
          <Text style={styles.highlightedBold}>
            Loan Term: The loan term is for {data.termMonths} month(s). Borrower agrees to repay
            the total loan amount (principal) at the end of the {data.termMonths}-month term.
          </Text>
        </View>

        <View style={[styles.highlighted, { marginTop: 4 }]}>
          <Text style={styles.highlightedBold}>
            At the end of the loan term, MFK receives a total sum of {totalRepaymentFormatted} —
            which is {principalFormatted} (principal) and {totalInterestFormatted} (interest @{' '}
            {monthlyInterestFormatted} per month).
          </Text>
        </View>
        <View style={styles.thinDivider} />

        {/* Section 4 — Loan Amount Increase */}
        <Text style={styles.sectionHeading}>4. Loan Amount Increase:</Text>
        <Text style={styles.paragraph}>
          MFK Lending Corporation reserves the right to increase or decrease the loan amount based
          on the borrower's repayment history and creditworthiness. Any changes to the loan amount
          will be communicated in advance and require a new written agreement.
        </Text>
        <View style={styles.thinDivider} />

        {/* Section 5 — Repayment, Penalties and Communication */}
        <Text style={styles.sectionHeading}>5. Repayment, Penalties and Communication:</Text>
        <View style={styles.highlighted}>
          <Text style={styles.highlightedBold}>
            Late Payment Penalty: A late payment penalty of 1% per day of the accrued interest
            for each day of delayed payment will be charged. For example, if the monthly interest
            is {monthlyInterestFormatted} and payment is 5 days late, the penalty is{' '}
            {formatPHP(Math.round(data.monthlyInterestCentavos * 0.01 * 5))}.
          </Text>
        </View>
        <Text style={styles.paragraph}>
          Total Amount Due: In the event of late payment, the borrower shall pay the outstanding
          principal, all accrued interest, and any applicable late payment penalties. The total
          amount due will be calculated as of the date of actual payment.
        </Text>
        <Text style={styles.paragraph}>
          Communication: The borrower agrees to maintain open communication with MFK Lending
          Corporation regarding any difficulties in meeting payment obligations. All payment
          notifications will be sent to the registered email and contact number.
        </Text>
        <View style={styles.thinDivider} />

        {/* Section 6 — Miscellaneous */}
        <Text style={styles.sectionHeading}>6. Miscellaneous:</Text>
        <Text style={styles.paragraph}>
          Data Privacy: MFK Lending Corporation will handle all personal information in accordance
          with the Data Privacy Act of 2012 (Republic Act 10173). Borrower information will only
          be used for loan processing and communication purposes.
        </Text>
        <Text style={styles.paragraph}>
          Agreement Changes: MFK Lending Corporation reserves the right to modify this Agreement.
          Borrowers will be notified of any changes at least 30 days in advance.
        </Text>
        <Text style={styles.paragraph}>
          Dispute Resolution: Any disputes arising from this Agreement shall be resolved through
          mutual discussion between the parties. If unresolved, disputes may be escalated to the
          appropriate legal authorities in the Philippines.
        </Text>

        {/* Signature Block */}
        <View style={styles.signatureSection}>
          <Text style={styles.signatureText}>
            By accepting this Agreement, the Borrower acknowledges and agrees to all the terms
            and conditions specified above.
          </Text>
          <View style={styles.signatureLine} />
          <Text style={styles.signatureLabel}>Borrower Signature</Text>
          <View style={styles.row}>
            <Text style={[styles.label, { fontSize: 9 }]}>Date:</Text>
            <Text style={styles.value}>{data.documentDate}</Text>
          </View>
        </View>

        <Text style={styles.docId}>Document ID: {data.loanId}</Text>
      </Page>
    </Document>
  )
}
```

- [ ] **Step 2: Create generator.ts**

Create `src/lib/contracts/generator.ts`:

```typescript
/**
 * Contract PDF generation for MFK Lending Corp.
 * SERVER-SIDE ONLY — never import in client components.
 */
import { renderToBuffer } from '@react-pdf/renderer'
import { format, parseISO } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'
import { calcMonthlyInterest, calcFlatTotalRepayment } from '@/lib/finance'
import type { ContractData, LoanFull } from '@/types'
import { ContractPDF } from './ContractPDF'

const MANILA_TZ = 'Asia/Manila'

// Static MFK business constants
const MFK_BANK_NAME = 'GoTyme Bank'
const MFK_ACCOUNT_NAME = 'MFK Lending Corp'
const MFK_ACCOUNT_NUMBER = '014721202843'

/**
 * Formats a LoanFull (with borrower) into the ContractData shape for PDF generation.
 *
 * @param loan - Full loan record with borrower joined
 * @param outstandingBalanceCentavos - For hybrid_diminishing: override principal with remaining balance.
 *   If not provided for hybrid loans, falls back to loan.principal.
 */
export function formatContractData(
  loan: LoanFull,
  outstandingBalanceCentavos?: number
): ContractData {
  const principalCentavos =
    loan.loan_type === 'hybrid_diminishing' && outstandingBalanceCentavos !== undefined
      ? outstandingBalanceCentavos
      : loan.principal

  const monthlyInterestCentavos = calcMonthlyInterest(principalCentavos, loan.interest_rate)
  const totalRepaymentCentavos = calcFlatTotalRepayment(
    principalCentavos,
    loan.interest_rate,
    loan.term_months
  )

  // Format document date in Manila time
  const nowManila = toZonedTime(new Date(), MANILA_TZ)
  const documentDate = format(nowManila, 'MMMM d, yyyy')

  return {
    borrowerFullName: loan.borrower.full_name,
    borrowerAge: loan.borrower.age ?? 0,
    borrowerOccupation: loan.borrower.occupation ?? '',
    borrowerPhone: loan.borrower.phone ?? '',
    borrowerEmail: loan.borrower.email,
    borrowerBank: loan.borrower.bank_name ?? '',
    borrowerAccountName: loan.borrower.account_name ?? '',
    borrowerAccountNumber: loan.borrower.account_number ?? '',
    loanPurpose: (loan as unknown as { purpose?: string }).purpose ?? null,
    principalCentavos,
    interestRate: loan.interest_rate,
    termMonths: loan.term_months,
    monthlyInterestCentavos,
    totalRepaymentCentavos,
    mfkBankName: MFK_BANK_NAME,
    mfkAccountName: MFK_ACCOUNT_NAME,
    mfkAccountNumber: MFK_ACCOUNT_NUMBER,
    documentDate,
    loanId: loan.id,
  }
}

/**
 * Generates the MFK loan agreement PDF and returns it as a Buffer.
 * Uses renderToBuffer() — the server-safe method (not renderToStream).
 */
export async function generateContractPDF(data: ContractData): Promise<Buffer> {
  const buffer = await renderToBuffer(<ContractPDF data={data} />)
  return Buffer.from(buffer)
}
```

- [ ] **Step 3: Verify compile**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/contracts/
git commit -m "feat: ContractPDF react-pdf component and generator"
```

---

## Task 5: Unit Tests — formatContractData

**Files:**
- Create: `src/lib/contracts/__tests__/generator.test.ts`

- [ ] **Step 1: Write the tests**

Create `src/lib/contracts/__tests__/generator.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { formatContractData } from '../generator'
import type { LoanFull } from '@/types'

// ₱30,000 flat interest loan at 5% for 3 months
const mockLoan: LoanFull = {
  id: 'loan-test-uuid',
  borrower_id: 'borrower-uuid',
  loan_type: 'flat_interest',
  principal: 3_000_000,          // ₱30,000 in centavos
  interest_rate: 0.05,
  term_months: 3,
  start_date: '2026-03-25',
  end_date: '2026-06-25',
  disbursed_at: null,
  status: 'active',
  signwell_document_id: null,
  contract_url: null,
  reminders_enabled: true,
  contract_status: 'none',
  contract_sent_at: null,
  contract_signed_at: null,
  contract_signed_pdf_path: null,
  imported_at: null,
  import_source: null,
  created_at: '2026-03-25T00:00:00Z',
  updated_at: '2026-03-25T00:00:00Z',
  borrower: {
    id: 'borrower-uuid',
    full_name: 'Melca Ybañez',
    age: 35,
    occupation: 'Teacher',
    email: 'melca@example.com',
    phone: '09171234567',
    bank_name: 'BPI',
    account_name: 'Melca Ybañez',
    account_number: '1234567890',
    created_at: '2026-01-01T00:00:00Z',
  },
  loan_schedules: [],
  payments: [],
}

describe('formatContractData', () => {
  it('returns correct ContractData shape for a flat_interest loan', () => {
    const result = formatContractData(mockLoan)

    expect(result.loanId).toBe('loan-test-uuid')
    expect(result.borrowerFullName).toBe('Melca Ybañez')
    expect(result.borrowerEmail).toBe('melca@example.com')
    expect(result.principalCentavos).toBe(3_000_000)
    expect(result.interestRate).toBe(0.05)
    expect(result.termMonths).toBe(3)
  })

  it('computes monthlyInterestCentavos = principal × rate', () => {
    const result = formatContractData(mockLoan)
    // ₱30,000 × 5% = ₱1,500 = 150,000 centavos
    expect(result.monthlyInterestCentavos).toBe(150_000)
  })

  it('computes totalRepaymentCentavos = principal + (monthlyInterest × termMonths)', () => {
    const result = formatContractData(mockLoan)
    // ₱30,000 + (₱1,500 × 3) = ₱34,500 = 3,450,000 centavos
    expect(result.totalRepaymentCentavos).toBe(3_450_000)
  })

  it('uses MFK static GoTyme account details', () => {
    const result = formatContractData(mockLoan)
    expect(result.mfkBankName).toBe('GoTyme Bank')
    expect(result.mfkAccountName).toBe('MFK Lending Corp')
    expect(result.mfkAccountNumber).toBe('014721202843')
  })

  it('formats documentDate as "MMMM d, yyyy"', () => {
    const result = formatContractData(mockLoan)
    // e.g. "April 1, 2026" — just validate format pattern
    expect(result.documentDate).toMatch(/^[A-Z][a-z]+ \d{1,2}, \d{4}$/)
  })

  it('returns null loanPurpose when purpose field not set', () => {
    const result = formatContractData(mockLoan)
    expect(result.loanPurpose).toBeNull()
  })

  it('uses outstandingBalanceCentavos override for hybrid_diminishing loans', () => {
    const hybridLoan: LoanFull = {
      ...mockLoan,
      loan_type: 'hybrid_diminishing',
      principal: 20_000_000, // ₱200,000 original
    }
    const outstandingBalance = 19_500_000 // ₱195,000 after partial return
    const result = formatContractData(hybridLoan, outstandingBalance)

    expect(result.principalCentavos).toBe(19_500_000)
    expect(result.monthlyInterestCentavos).toBe(975_000) // 195,000 × 5% = 9,750
  })

  it('falls back to loan.principal for hybrid_diminishing when no override provided', () => {
    const hybridLoan: LoanFull = {
      ...mockLoan,
      loan_type: 'hybrid_diminishing',
    }
    const result = formatContractData(hybridLoan)
    expect(result.principalCentavos).toBe(3_000_000)
  })
})
```

- [ ] **Step 2: Run tests**

```bash
npx vitest run src/lib/contracts/__tests__/generator.test.ts
```

Expected: 8 tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/lib/contracts/__tests__/
git commit -m "test: formatContractData unit tests"
```

---

## Task 6: Contract Server Action

**Files:**
- Create: `src/lib/actions/contracts.ts`

- [ ] **Step 1: Create contracts.ts action**

Create `src/lib/actions/contracts.ts`:

```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { createClient } from '@/lib/supabase/server'
import { withSentry } from './with-sentry'
import { actionSuccess, actionError } from './index'
import { generateContractPDF, formatContractData } from '@/lib/contracts/generator'
import { createAndSendDocument } from '@/lib/signwell/client'
import type { ActionState } from './index'
import type { LoanFull } from '@/types'

// ─── generateAndSendContract ──────────────────────────────────────────────────

export const generateAndSendContract = withSentry(
  'generateAndSendContract',
  async (loanId: string): Promise<ActionState> => {
    // 1. Validate: authenticated user
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return actionError('Unauthorized')

    // 2. Fetch loan with borrower (service role to bypass RLS)
    const serviceClient = createServiceRoleClient()
    const { data: loanData, error: loanError } = await serviceClient
      .from('loans')
      .select('*, borrower:borrowers(*), loan_schedules(*), payments(*)')
      .eq('id', loanId)
      .single()

    if (loanError || !loanData) {
      return actionError('Loan not found')
    }

    const loan = loanData as unknown as LoanFull

    // 3. Validate contract status
    if (loan.contract_status === 'pending_signature') {
      return actionError('Contract already sent — awaiting signature')
    }
    if (loan.contract_status === 'signed') {
      return actionError('Contract already signed')
    }

    // 4. For hybrid_diminishing, compute outstanding balance
    let outstandingBalance: number | undefined
    if (loan.loan_type === 'hybrid_diminishing') {
      const { data: returns } = await serviceClient
        .from('principal_returns')
        .select('amount')
        .eq('loan_id', loanId)
      const totalReturned = (returns ?? []).reduce((sum: number, r: { amount: number }) => sum + r.amount, 0)
      outstandingBalance = loan.principal - totalReturned
    }

    // 5. Format contract data
    const contractData = formatContractData(loan, outstandingBalance)

    // 6. Generate PDF
    let pdfBuffer: Buffer
    try {
      pdfBuffer = await generateContractPDF(contractData)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      return actionError(`PDF generation failed: ${msg}`)
    }

    // 7. Send to SignWell
    const pdfBase64 = pdfBuffer.toString('base64')
    const signwellResult = await createAndSendDocument({
      name: `MFK Loan Agreement - ${loan.borrower.full_name}`,
      pdfBase64,
      signerName: loan.borrower.full_name,
      signerEmail: loan.borrower.email,
    })

    if (!signwellResult.success) {
      return actionError(`Failed to send contract: ${signwellResult.error}`)
    }

    const swDoc = signwellResult.data

    // 8. Update loan record
    const now = new Date().toISOString()
    const { error: updateError } = await serviceClient
      .from('loans')
      .update({
        signwell_document_id: swDoc.id,
        contract_url: swDoc.signingUrl,
        contract_status: 'pending_signature',
        contract_sent_at: now,
      })
      .eq('id', loanId)

    if (updateError) {
      return actionError('Failed to update loan record after sending contract')
    }

    // 9. Upload unsigned PDF to Supabase Storage
    const { error: uploadError } = await serviceClient.storage
      .from('contracts')
      .upload(`contracts/${loanId}/unsigned.pdf`, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      })

    if (uploadError) {
      // Non-fatal — contract was sent, just log
      console.error('[generateAndSendContract] Storage upload failed:', uploadError.message)
    }

    revalidatePath(`/loans/${loanId}`)

    return actionSuccess(`Contract sent to ${loan.borrower.email} for signature`)
  }
)

// ─── resendContract ───────────────────────────────────────────────────────────

export const resendContract = withSentry(
  'resendContract',
  async (loanId: string): Promise<ActionState> => {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return actionError('Unauthorized')

    const serviceClient = createServiceRoleClient()
    const { data: loanData, error: loanError } = await serviceClient
      .from('loans')
      .select('*, borrower:borrowers(*), loan_schedules(*), payments(*)')
      .eq('id', loanId)
      .single()

    if (loanError || !loanData) return actionError('Loan not found')

    const loan = loanData as unknown as LoanFull

    if (loan.contract_status !== 'expired' && loan.contract_status !== 'declined') {
      return actionError('Can only resend contracts that are expired or declined')
    }

    let outstandingBalance: number | undefined
    if (loan.loan_type === 'hybrid_diminishing') {
      const { data: returns } = await serviceClient
        .from('principal_returns')
        .select('amount')
        .eq('loan_id', loanId)
      const totalReturned = (returns ?? []).reduce((sum: number, r: { amount: number }) => sum + r.amount, 0)
      outstandingBalance = loan.principal - totalReturned
    }

    const contractData = formatContractData(loan, outstandingBalance)
    let pdfBuffer: Buffer
    try {
      pdfBuffer = await generateContractPDF(contractData)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      return actionError(`PDF generation failed: ${msg}`)
    }

    const pdfBase64 = pdfBuffer.toString('base64')
    const signwellResult = await createAndSendDocument({
      name: `MFK Loan Agreement - ${loan.borrower.full_name}`,
      pdfBase64,
      signerName: loan.borrower.full_name,
      signerEmail: loan.borrower.email,
    })

    if (!signwellResult.success) {
      return actionError(`Failed to resend contract: ${signwellResult.error}`)
    }

    const swDoc = signwellResult.data
    const now = new Date().toISOString()

    await serviceClient
      .from('loans')
      .update({
        signwell_document_id: swDoc.id,
        contract_url: swDoc.signingUrl,
        contract_status: 'pending_signature',
        contract_sent_at: now,
        contract_signed_at: null,
        contract_signed_pdf_path: null,
      })
      .eq('id', loanId)

    await serviceClient.storage
      .from('contracts')
      .upload(`contracts/${loanId}/unsigned.pdf`, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      })

    revalidatePath(`/loans/${loanId}`)
    return actionSuccess(`Contract resent to ${loan.borrower.email} for signature`)
  }
)

// ─── getContractDownloadUrl ───────────────────────────────────────────────────

export async function getContractDownloadUrl(
  loanId: string,
  type: 'signed' | 'unsigned' = 'unsigned'
): Promise<{ url: string } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const path = `contracts/${loanId}/${type}.pdf`
  const serviceClient = createServiceRoleClient()

  const { data, error } = await serviceClient.storage
    .from('contracts')
    .createSignedUrl(path, 3600) // 1 hour

  if (error || !data?.signedUrl) {
    return { error: 'Could not generate download URL' }
  }

  return { url: data.signedUrl }
}
```

- [ ] **Step 2: Type check**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/actions/contracts.ts
git commit -m "feat: generateAndSendContract, resendContract, getContractDownloadUrl actions"
```

---

## Task 7: SignWell Webhook Handler

**Files:**
- Create: `src/app/api/webhooks/signwell/route.ts`

- [ ] **Step 1: Create the webhook route**

Create `src/app/api/webhooks/signwell/route.ts`:

```typescript
/**
 * SignWell webhook endpoint.
 *
 * Handles: document_completed, document_declined, document_expired
 *
 * Security: validates HMAC-SHA256 signature on every request.
 * Any request that fails validation is rejected with 401.
 *
 * IMPORTANT: Returns 200 to SignWell immediately after updating the loan status.
 * The signed PDF download and storage upload happen synchronously but quickly.
 * SignWell retries if it doesn't receive 200 within 10 seconds.
 *
 * Local testing: use `ngrok http 3000` and register
 * https://<ngrok-id>.ngrok.io/api/webhooks/signwell in SignWell dashboard.
 */
import { NextRequest, NextResponse } from 'next/server'
import { validateWebhookSignature, downloadSignedPDF } from '@/lib/signwell/client'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import type { SignWellWebhookPayload } from '@/types'

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('x-signwell-signature') ?? ''

  // 1. Validate signature — reject anything that doesn't match
  if (!validateWebhookSignature(body, signature)) {
    console.warn('[signwell-webhook] Signature validation failed')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let payload: SignWellWebhookPayload
  try {
    payload = JSON.parse(body)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { event, document } = payload
  const supabase = createServiceRoleClient()

  // 2. Find loan by signwell_document_id
  const { data: loan, error: loanError } = await supabase
    .from('loans')
    .select('id, borrower_id, contract_status')
    .eq('signwell_document_id', document.id)
    .single()

  if (loanError || !loan) {
    console.warn('[signwell-webhook] Loan not found for document:', document.id)
    // Return 200 so SignWell doesn't keep retrying for a document we don't know about
    return NextResponse.json({ received: true }, { status: 200 })
  }

  try {
    if (event === 'document_completed') {
      await handleDocumentCompleted(loan.id, document, supabase)
    } else if (event === 'document_declined') {
      await handleDocumentDeclined(loan.id, supabase)
    } else if (event === 'document_expired') {
      await handleDocumentExpired(loan.id, supabase)
    }

    return NextResponse.json({ received: true }, { status: 200 })
  } catch (error) {
    console.error('[signwell-webhook] Processing failed:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}

// ─── Event handlers ───────────────────────────────────────────────────────────

async function handleDocumentCompleted(
  loanId: string,
  document: SignWellWebhookPayload['document'],
  supabase: ReturnType<typeof createServiceRoleClient>
) {
  // Update contract status immediately
  await supabase
    .from('loans')
    .update({
      contract_status: 'signed',
      contract_signed_at: document.completed_at,
    })
    .eq('id', loanId)

  // Download signed PDF from SignWell and store it
  const pdfResult = await downloadSignedPDF(document.id)

  if (pdfResult.success) {
    const { error: uploadError } = await supabase.storage
      .from('contracts')
      .upload(`contracts/${loanId}/signed.pdf`, pdfResult.data, {
        contentType: 'application/pdf',
        upsert: true,
      })

    if (!uploadError) {
      await supabase
        .from('loans')
        .update({
          contract_signed_pdf_path: `contracts/${loanId}/signed.pdf`,
        })
        .eq('id', loanId)
    } else {
      console.error('[signwell-webhook] Signed PDF upload failed:', uploadError.message)
    }
  } else {
    console.error('[signwell-webhook] Signed PDF download failed:', pdfResult.error)
  }
}

async function handleDocumentDeclined(
  loanId: string,
  supabase: ReturnType<typeof createServiceRoleClient>
) {
  await supabase
    .from('loans')
    .update({ contract_status: 'declined' })
    .eq('id', loanId)

  console.warn('[signwell-webhook] Contract declined for loan:', loanId)
}

async function handleDocumentExpired(
  loanId: string,
  supabase: ReturnType<typeof createServiceRoleClient>
) {
  await supabase
    .from('loans')
    .update({ contract_status: 'expired' })
    .eq('id', loanId)
}
```

- [ ] **Step 2: Type check**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/webhooks/signwell/
git commit -m "feat: SignWell webhook handler with signature validation"
```

---

## Task 8: next.config.ts — serverExternalPackages

**Files:**
- Modify: `next.config.ts`

- [ ] **Step 1: Add serverExternalPackages**

Read `next.config.ts` first, then replace its content with:

```typescript
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  serverExternalPackages: ['@react-pdf/renderer'],
}

export default nextConfig
```

- [ ] **Step 2: Verify dev server starts**

```bash
npm run dev
```

Expected: starts without "Cannot find module" errors. Press Ctrl+C to stop.

- [ ] **Step 3: Commit**

```bash
git add next.config.ts
git commit -m "chore: add @react-pdf/renderer to serverExternalPackages"
```

---

## Task 9: ContractSection Component (loan detail page)

**Files:**
- Create: `src/components/loans/ContractSection.tsx`
- Modify: `src/components/loans/LoanDetailClient.tsx`

- [ ] **Step 1: Create ContractSection.tsx**

Create `src/components/loans/ContractSection.tsx`:

```tsx
'use client'

import { useRouter } from 'next/navigation'
import { useTransition, useState, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  generateAndSendContract,
  resendContract,
  getContractDownloadUrl,
} from '@/lib/actions/contracts'
import { queryKeys } from '@/lib/query-keys'
import { formatManila } from '@/lib/utils/date'
import type { ContractStatus } from '@/types'

interface ContractSectionProps {
  loanId: string
  borrowerEmail: string
  contractStatus: ContractStatus
  contractSentAt: string | null
  contractSignedAt: string | null
  contractSignedPdfPath: string | null
}

export function ContractSection({
  loanId,
  borrowerEmail,
  contractStatus,
  contractSentAt,
  contractSignedAt,
}: ContractSectionProps) {
  const [isPending, startTransition] = useTransition()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [loadingPhase, setLoadingPhase] = useState<'pdf' | 'sending'>('pdf')
  const queryClient = useQueryClient()
  const router = useRouter()

  // Two-phase loading message: "Generating..." → "Sending..." after 2.5s
  useEffect(() => {
    if (!isPending) {
      setLoadingPhase('pdf')
      return
    }
    const timer = setTimeout(() => setLoadingPhase('sending'), 2500)
    return () => clearTimeout(timer)
  }, [isPending])

  function handleGenerate() {
    setErrorMsg(null)
    setSuccessMsg(null)
    startTransition(async () => {
      const result = await generateAndSendContract(loanId)
      if (result.success) {
        setSuccessMsg(result.message)
        queryClient.invalidateQueries({ queryKey: queryKeys.loans.detail(loanId) })
        router.refresh()
      } else {
        setErrorMsg(result.message)
      }
    })
  }

  function handleResend() {
    setErrorMsg(null)
    setSuccessMsg(null)
    startTransition(async () => {
      const result = await resendContract(loanId)
      if (result.success) {
        setSuccessMsg(result.message)
        queryClient.invalidateQueries({ queryKey: queryKeys.loans.detail(loanId) })
        router.refresh()
      } else {
        setErrorMsg(result.message)
      }
    })
  }

  async function handleDownload(type: 'signed' | 'unsigned') {
    const result = await getContractDownloadUrl(loanId, type)
    if ('url' in result) {
      window.open(result.url, '_blank')
    } else {
      setErrorMsg(result.error)
    }
  }

  const loadingMessage =
    loadingPhase === 'pdf' ? 'Generating contract PDF...' : 'Sending to borrower...'

  return (
    <div className="border-t pt-3 flex flex-col gap-2">
      <p className="text-xs text-muted-foreground mb-1">Contract</p>

      {/* Status Badge */}
      {contractStatus === 'none' && (
        <Badge variant="outline" className="text-muted-foreground border-muted-foreground/40 w-fit">
          No Contract
        </Badge>
      )}
      {contractStatus === 'pending_signature' && (
        <>
          <Badge className="w-fit bg-yellow-100 text-yellow-800 border-yellow-300 border">
            Awaiting Signature
          </Badge>
          {contractSentAt && (
            <p className="text-xs text-muted-foreground">
              Sent {formatManila(contractSentAt, 'MMM d, yyyy h:mm a')}
            </p>
          )}
        </>
      )}
      {contractStatus === 'signed' && (
        <>
          <Badge className="w-fit bg-green-100 text-green-800 border-green-300 border">
            Signed ✓
          </Badge>
          {contractSignedAt && (
            <p className="text-xs text-muted-foreground">
              Signed {formatManila(contractSignedAt, 'MMM d, yyyy h:mm a')}
            </p>
          )}
        </>
      )}
      {contractStatus === 'declined' && (
        <>
          <Badge className="w-fit bg-red-100 text-red-800 border-red-300 border">Declined</Badge>
          <p className="text-xs text-muted-foreground">Borrower declined to sign</p>
        </>
      )}
      {contractStatus === 'expired' && (
        <Badge className="w-fit bg-orange-100 text-orange-800 border-orange-300 border">
          Expired
        </Badge>
      )}

      {/* Loading state */}
      {isPending && (
        <p className="text-xs text-muted-foreground animate-pulse">{loadingMessage}</p>
      )}

      {/* Feedback messages */}
      {errorMsg && <p className="text-xs text-red-600">{errorMsg}</p>}
      {successMsg && <p className="text-xs text-green-600">{successMsg}</p>}

      {/* Actions */}
      <div className="flex flex-col gap-1.5 mt-1">
        {contractStatus === 'none' && (
          <>
            <Button
              size="sm"
              onClick={handleGenerate}
              disabled={isPending}
            >
              {isPending ? loadingMessage : 'Generate & Send Contract'}
            </Button>
            <Button size="sm" variant="ghost" asChild>
              <a href={`/loans/${loanId}/contract`}>Preview Contract</a>
            </Button>
          </>
        )}

        {contractStatus === 'pending_signature' && (
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={handleResend}
              disabled={isPending}
            >
              Resend Contract
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleDownload('unsigned')}
            >
              View Unsigned Contract
            </Button>
          </>
        )}

        {contractStatus === 'signed' && (
          <Button
            size="sm"
            onClick={() => handleDownload('signed')}
          >
            Download Signed Contract
          </Button>
        )}

        {(contractStatus === 'declined' || contractStatus === 'expired') && (
          <Button
            size="sm"
            onClick={handleResend}
            disabled={isPending}
          >
            {isPending ? loadingMessage : 'Resend Contract'}
          </Button>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Update LoanDetailClient.tsx — replace placeholder badge**

In `src/components/loans/LoanDetailClient.tsx`:

**Add import** at the top (after existing imports):
```typescript
import { ContractSection } from '@/components/loans/ContractSection'
```

**Replace the header placeholder badge** (lines 68-71):
```tsx
// Remove this:
<Badge variant="outline" className="text-muted-foreground border-muted-foreground/40">
  Contract: Pending
</Badge>

// Replace with nothing (contract status is shown in the sidebar only)
```

**Replace the sidebar contract placeholder** (lines 169-174):
```tsx
// Remove this entire block:
<div className="border-t pt-3">
  <p className="text-xs text-muted-foreground mb-1.5">Contract</p>
  <Badge variant="outline" className="text-muted-foreground border-muted-foreground/40">
    Pending
  </Badge>
</div>

// Replace with:
<ContractSection
  loanId={loan.id}
  borrowerEmail={loan.borrower.email}
  contractStatus={loan.contract_status}
  contractSentAt={loan.contract_sent_at}
  contractSignedAt={loan.contract_signed_at}
  contractSignedPdfPath={loan.contract_signed_pdf_path}
/>
```

- [ ] **Step 3: Type check**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/loans/
git commit -m "feat: ContractSection component replaces placeholder in loan detail"
```

---

## Task 10: Loans List — Contract Column

**Files:**
- Modify: `src/lib/data/loans-query.ts`
- Modify: `src/components/loans/LoansClient.tsx`

- [ ] **Step 1: Verify contract_status is included in SELECT**

In `src/lib/data/loans-query.ts`, the `queryLoans` function selects `'*, borrower:borrowers(*)'`. The `*` already includes `contract_status` since it was added to the table via migration. No change needed here.

- [ ] **Step 2: Add contract column to LoansClient table**

In `src/components/loans/LoansClient.tsx`, find the `<TableHeader>` section and add a "Contract" `<TableHead>` after the "Status" column. Then in `<TableBody>`, add the contract status cell.

Add this import at the top:
```typescript
import { Badge } from '@/components/ui/badge'
import type { ContractStatus } from '@/types'
```

Add this helper function before `LoansClient`:
```typescript
function ContractBadge({ status }: { status: ContractStatus }) {
  if (status === 'none') return <span className="text-muted-foreground text-sm">—</span>
  if (status === 'pending_signature')
    return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300 border text-xs">Awaiting Signature</Badge>
  if (status === 'signed')
    return <Badge className="bg-green-100 text-green-800 border-green-300 border text-xs">Signed</Badge>
  if (status === 'declined')
    return <Badge className="bg-red-100 text-red-800 border-red-300 border text-xs">Declined</Badge>
  if (status === 'expired')
    return <Badge className="bg-orange-100 text-orange-800 border-orange-300 border text-xs">Expired</Badge>
  return null
}
```

In the `<TableHeader>`, add after the Status column:
```tsx
<TableHead>Contract</TableHead>
```

In each `<TableRow>` in `<TableBody>`, add after the Status cell:
```tsx
<TableCell>
  <ContractBadge status={loan.contract_status} />
</TableCell>
```

- [ ] **Step 3: Type check**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/loans/ src/lib/data/
git commit -m "feat: contract status column in loans list"
```

---

## Task 11: Contract Preview Page

**Files:**
- Create: `src/app/(app)/loans/[id]/contract/page.tsx`

- [ ] **Step 1: Create the preview page**

Create `src/app/(app)/loans/[id]/contract/page.tsx`:

```tsx
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getLoanById } from '@/lib/data/loans.server'
import { formatContractData } from '@/lib/contracts/generator'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { ContractPreviewActions } from '@/components/loans/ContractPreviewActions'
import { formatPHP } from '@/lib/utils/currency'

interface ContractPageProps {
  params: Promise<{ id: string }>
}

export default async function ContractPreviewPage({ params }: ContractPageProps) {
  const { id } = await params
  const loan = await getLoanById(id)

  if (!loan) notFound()

  const data = formatContractData(loan)

  const totalInterest = data.monthlyInterestCentavos * data.termMonths

  return (
    <div className="flex flex-col gap-6 max-w-3xl mx-auto">
      <PageHeader
        title="Contract Preview"
        subtitle={`Review before sending to ${loan.borrower.full_name}`}
        action={
          <Button variant="outline" asChild>
            <Link href={`/loans/${id}`}>← Back</Link>
          </Button>
        }
      />

      <div className="rounded-xl border bg-card p-8 shadow-sm prose prose-sm max-w-none">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-black tracking-widest mb-1">MFK</h1>
          <p className="text-xs tracking-widest uppercase text-muted-foreground">Lending Corp</p>
          <hr className="my-4" />
          <h2 className="text-base font-bold">
            MFK Lending Corporation — Lending Agreement and Borrower Criteria
          </h2>
        </div>

        {/* Intro */}
        <p className="text-sm text-justify">
          This Lending Agreement ("Agreement") outlines the criteria and terms for borrowing from
          MFK Lending Corporation ("Lender"). Please read this Agreement carefully. By applying for
          and accepting a loan from MFK Lending Corporation, you acknowledge and agree to the
          following terms and conditions:
        </p>

        {/* Section 1 */}
        <h3 className="font-bold mt-6">1. Personal Information:</h3>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <div><span className="font-semibold">Full Name:</span> {data.borrowerFullName}</div>
          <div><span className="font-semibold">Age:</span> {data.borrowerAge}</div>
          <div><span className="font-semibold">Occupation:</span> {data.borrowerOccupation}</div>
          <div><span className="font-semibold">Contact Number:</span> {data.borrowerPhone}</div>
          <div className="col-span-2"><span className="font-semibold">Email:</span> {data.borrowerEmail}</div>
        </div>

        {/* Section 2 */}
        <h3 className="font-bold mt-6">2. Loan Application Requirements:</h3>
        <div className="text-sm space-y-1">
          <div><span className="font-semibold">Loan Purpose:</span> {data.loanPurpose ?? '—'}</div>
          <div className="bg-yellow-50 border border-yellow-200 rounded px-3 py-2 font-bold">
            Initial Loan Amount: {formatPHP(data.principalCentavos)}
          </div>
          <p className="font-semibold mt-3">Online Bank Account Information</p>
          <div><span className="font-semibold">Bank:</span> {data.borrowerBank}</div>
          <div><span className="font-semibold">Account Name:</span> {data.borrowerAccountName}</div>
          <div><span className="font-semibold">Account Number:</span> {data.borrowerAccountNumber}</div>
          <p className="italic text-xs text-muted-foreground mt-1">
            Borrower must possess a valid online bank account for loan disbursement and repayment.
          </p>
        </div>

        {/* Section 3 */}
        <h3 className="font-bold mt-6">3. Loan Terms and Conditions:</h3>
        <div className="text-sm space-y-3">
          <div className="bg-yellow-50 border border-yellow-200 rounded px-3 py-2 font-bold">
            Monthly Interest: The interest is calculated at a rate of 5% per month, on the
            outstanding loan balance for a three-month loan term.
          </div>
          <div className="border-2 border-gray-800 rounded p-4 text-center space-y-1">
            <div className="font-bold">Bank: {data.mfkBankName}</div>
            <div className="font-bold">Account Name: {data.mfkAccountName}</div>
            <div className="font-bold">Account Number: {data.mfkAccountNumber}</div>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded px-3 py-2 font-bold">
            Loan Term: The loan term is for {data.termMonths} month(s). Borrower agrees to repay
            the total loan amount (principal) at the end of the term.
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded px-3 py-2 font-bold">
            At the end of the loan term, MFK receives a total sum of {formatPHP(data.totalRepaymentCentavos)} —
            which is {formatPHP(data.principalCentavos)} (principal) and {formatPHP(totalInterest)} (interest
            @ {formatPHP(data.monthlyInterestCentavos)} per month).
          </div>
        </div>

        {/* Section 4 */}
        <h3 className="font-bold mt-6">4. Loan Amount Increase:</h3>
        <p className="text-sm">
          MFK Lending Corporation reserves the right to increase or decrease the loan amount based
          on the borrower's repayment history and creditworthiness. Any changes will be communicated
          in advance and require a new written agreement.
        </p>

        {/* Section 5 */}
        <h3 className="font-bold mt-6">5. Repayment, Penalties and Communication:</h3>
        <div className="text-sm space-y-2">
          <div className="bg-yellow-50 border border-yellow-200 rounded px-3 py-2 font-bold">
            Late Payment Penalty: 1% per day of the accrued interest for each day of delayed payment.
          </div>
          <p>
            Total Amount Due: In the event of late payment, the borrower shall pay the outstanding
            principal, all accrued interest, and any applicable late payment penalties.
          </p>
          <p>
            Communication: The borrower agrees to maintain open communication regarding any
            difficulties in meeting payment obligations.
          </p>
        </div>

        {/* Section 6 */}
        <h3 className="font-bold mt-6">6. Miscellaneous:</h3>
        <div className="text-sm space-y-2">
          <p>
            <strong>Data Privacy:</strong> MFK Lending Corporation will handle all personal
            information in accordance with the Data Privacy Act of 2012 (Republic Act 10173).
          </p>
          <p>
            <strong>Agreement Changes:</strong> MFK Lending Corporation reserves the right to
            modify this Agreement. Borrowers will be notified at least 30 days in advance.
          </p>
          <p>
            <strong>Dispute Resolution:</strong> Any disputes shall be resolved through mutual
            discussion. If unresolved, disputes may be escalated to appropriate legal authorities.
          </p>
        </div>

        {/* Signature block */}
        <div className="mt-8 pt-6 border-t">
          <p className="text-sm">
            By accepting this Agreement, the Borrower acknowledges and agrees to all the terms
            and conditions specified above.
          </p>
          <div className="mt-4">
            <div className="w-56 border-b border-gray-800 mb-1" />
            <p className="text-xs text-muted-foreground">Borrower Signature</p>
          </div>
          <p className="text-sm mt-3"><strong>Date:</strong> {data.documentDate}</p>
          <p className="text-xs text-muted-foreground mt-4">Document ID: {data.loanId}</p>
        </div>
      </div>

      {/* Send button */}
      <ContractPreviewActions
        loanId={id}
        contractStatus={loan.contract_status}
      />
    </div>
  )
}
```

- [ ] **Step 2: Create ContractPreviewActions client component**

Create `src/components/loans/ContractPreviewActions.tsx`:

```tsx
'use client'

import { useTransition, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { generateAndSendContract } from '@/lib/actions/contracts'
import type { ContractStatus } from '@/types'

interface ContractPreviewActionsProps {
  loanId: string
  contractStatus: ContractStatus
}

export function ContractPreviewActions({ loanId, contractStatus }: ContractPreviewActionsProps) {
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null)
  const router = useRouter()

  function handleSend() {
    setMessage(null)
    startTransition(async () => {
      const result = await generateAndSendContract(loanId)
      setMessage({ text: result.message, ok: result.success })
      if (result.success) {
        router.push(`/loans/${loanId}`)
      }
    })
  }

  if (contractStatus === 'signed') {
    return <p className="text-sm text-muted-foreground text-center">This contract has already been signed.</p>
  }

  if (contractStatus === 'pending_signature') {
    return <p className="text-sm text-muted-foreground text-center">Contract is awaiting signature.</p>
  }

  return (
    <div className="flex flex-col items-center gap-2 pb-8">
      {message && (
        <p className={`text-sm ${message.ok ? 'text-green-600' : 'text-red-600'}`}>{message.text}</p>
      )}
      <Button size="lg" onClick={handleSend} disabled={isPending}>
        {isPending ? 'Sending...' : 'Send for Signature'}
      </Button>
      <p className="text-xs text-muted-foreground">
        This will generate the PDF and send it to the borrower's email for e-signature.
      </p>
    </div>
  )
}
```

- [ ] **Step 3: Type check**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/\(app\)/loans/ src/components/loans/ContractPreviewActions.tsx
git commit -m "feat: contract preview page /loans/{id}/contract"
```

---

## Task 12: Environment Variables

**Files:**
- Modify: `.env.local`
- Create or modify: `.env.example` (if it exists)

- [ ] **Step 1: Add SIGNWELL_WEBHOOK_SECRET to .env.local**

Add to `.env.local`:
```
SIGNWELL_WEBHOOK_SECRET=
```

Get this value from SignWell Dashboard → API → Webhooks → Webhook Secret.
It is **different** from `SIGNWELL_API_KEY`.

- [ ] **Step 2: Register webhook URL in SignWell**

1. Log into SignWell dashboard
2. Go to API → Webhooks
3. Add webhook URL: `https://mfklending.com/api/webhooks/signwell`
4. Select events: `document_completed`, `document_declined`, `document_expired`
5. Copy the webhook secret value into `SIGNWELL_WEBHOOK_SECRET` in `.env.local`

For local testing: use `ngrok http 3000` to get a public URL, then register
`https://<ngrok-id>.ngrok.io/api/webhooks/signwell` temporarily.

- [ ] **Step 3: Commit (don't commit .env.local — it's gitignored)**

```bash
git status  # confirm .env.local is NOT staged
git commit --allow-empty -m "chore: document SIGNWELL_WEBHOOK_SECRET env var requirement"
```

---

## Task 13: Final Verification

- [ ] **Step 1: Run all unit tests**

```bash
npx vitest run
```

Expected: all tests pass (signwell client + contract generator + existing tests).

- [ ] **Step 2: Type check**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 3: Lint**

```bash
npx biome check .
```

Fix any reported issues before proceeding.

- [ ] **Step 4: Smoke test (manual)**

```bash
npm run dev
```

1. Navigate to an existing loan at `/loans/{id}`
2. Verify the sidebar shows "No Contract" badge and "Generate & Send Contract" button
3. Click "Preview Contract" → verify HTML preview loads with correct data
4. Verify the contract shows correct borrower name, loan amount, GoTyme account number
5. Click "Generate & Send Contract"
6. Verify loading state appears ("Generating contract PDF..." → "Sending to borrower...")
7. Verify success message appears
8. In Supabase dashboard: confirm `contract_status = 'pending_signature'` on the loan row
9. In Supabase Storage: confirm `contracts/{loanId}/unsigned.pdf` exists
10. In SignWell dashboard (test mode): confirm document appears

- [ ] **Step 5: Final commit**

```bash
git add .
git commit -m "feat: phase 5 complete — contract generation, SignWell e-signature, Supabase Storage"
```

---

## Self-Review Checklist

### Spec coverage

| Spec Requirement | Task |
|---|---|
| DB migration: contract columns | Task 1 |
| DB migration: storage bucket | Task 1 |
| Index on signwell_document_id | Task 1 |
| ContractStatus type | Task 2 |
| ContractData interface | Task 2 |
| SignWellWebhookPayload type | Task 2 |
| Loan interface contract fields | Task 2 |
| createAndSendDocument() | Task 3 |
| test_mode=1 in dev | Task 3 |
| getDocument() | Task 3 |
| downloadSignedPDF() | Task 3 |
| validateWebhookSignature() timingSafeEqual | Task 3 |
| SIGNWELL_WEBHOOK_SECRET (not API key) | Task 3 |
| SignWellResult<T> return type | Task 3 |
| generateContractPDF() renderToBuffer | Task 4 |
| ContractPDF.tsx all 6 sections | Task 4 |
| GoTyme account 014721202843 in Section 3 | Task 4 |
| formatContractData() | Task 4 |
| formatContractData unit tests | Task 5 |
| validateWebhookSignature unit tests | Task 3 |
| generateAndSendContract 13-step flow | Task 6 |
| resendContract for expired/declined | Task 6 |
| getContractDownloadUrl 1-hour URL | Task 6 |
| POST /api/webhooks/signwell validates sig | Task 7 |
| handleDocumentCompleted | Task 7 |
| handleDocumentDeclined | Task 7 |
| handleDocumentExpired | Task 7 |
| GET returns 405 | Task 7 |
| serverExternalPackages config | Task 8 |
| Loan detail contract status UI — all 5 states | Task 9 |
| Two-phase loading message | Task 9 |
| TanStack Query invalidation on success | Task 9 |
| Preview Contract button | Task 9 |
| Loans list contract column | Task 10 |
| Contract preview page HTML | Task 11 |
| Send for Signature button on preview | Task 11 |
| SIGNWELL_WEBHOOK_SECRET env var | Task 12 |

### Type consistency check
- `ContractData` defined in Task 2, used in Tasks 4, 6
- `SignWellResult<T>` defined in Task 3, returned by all SignWell functions
- `SignWellDocument` (id, status, signingUrl, expiresAt) consistent across Task 3 and Task 6
- `ContractStatus` defined in Task 2, used in Tasks 9, 10
- `LoanFull` already includes contract fields after Task 2 Loan interface update
- `formatContractData(loan: LoanFull, outstandingBalance?: number)` consistent across Tasks 4 and 6
- `generateAndSendContract(loanId: string)` consistent across Tasks 6, 9, 11
- `createServiceRoleClient()` from `@/lib/supabase/service-role` used consistently
