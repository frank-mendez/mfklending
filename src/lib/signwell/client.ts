/**
 * SignWell API client for MFK Lending Corp.
 * SERVER-SIDE ONLY — never import in client components.
 *
 * API base: https://www.signwell.com/api/v1
 * Auth: Authorization: Token token={SIGNWELL_API_KEY}
 */
import crypto from 'node:crypto'

const SIGNWELL_API_KEY = process.env.SIGNWELL_API_KEY
const SIGNWELL_BASE_URL = 'https://www.signwell.com/api/v1'

// ─── Types ────────────────────────────────────────────────────────────────────

export type SignWellResult<T> = { success: true; data: T } | { success: false; error: string }

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
export async function getDocument(documentId: string): Promise<SignWellResult<SignWellDocument>> {
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
    const response = await fetch(`${SIGNWELL_BASE_URL}/documents/${documentId}/completed_pdf`, {
      headers: authHeader(),
    })

    if (!response.ok) {
      const text = await response.text()
      return {
        success: false,
        error: `SignWell downloadSignedPDF error ${response.status}: ${text}`,
      }
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
export function validateWebhookSignature(payload: string, signatureHeader: string): boolean {
  const secret = process.env.SIGNWELL_WEBHOOK_SECRET
  if (!secret || !signatureHeader) return false
  try {
    const expectedSig = crypto.createHmac('sha256', secret).update(payload).digest('hex')

    const expected = Buffer.from(expectedSig)
    const received = Buffer.from(signatureHeader)

    if (expected.length !== received.length) return false
    return crypto.timingSafeEqual(expected, received)
  } catch {
    return false
  }
}
