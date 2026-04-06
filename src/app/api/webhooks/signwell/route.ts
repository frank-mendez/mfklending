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
 * Local testing: use `ngrok http 3000` to get a public URL, then register
 * https://<ngrok-id>.ngrok.io/api/webhooks/signwell in SignWell dashboard
 * (API → Webhooks). Copy the webhook secret into SIGNWELL_WEBHOOK_SECRET in .env.local.
 */
import { type NextRequest, NextResponse } from 'next/server'
import { downloadSignedPDF, validateWebhookSignature } from '@/lib/signwell/client'
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
  const { error: statusError } = await supabase
    .from('loans')
    .update({
      contract_status: 'signed',
      contract_signed_at: document.completed_at,
    })
    .eq('id', loanId)

  if (statusError) {
    throw new Error(`Failed to update loan status to signed: ${statusError.message}`)
  }

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
  const { error } = await supabase
    .from('loans')
    .update({ contract_status: 'declined' })
    .eq('id', loanId)

  if (error) {
    throw new Error(`Failed to update loan status to declined: ${error.message}`)
  }

  console.warn('[signwell-webhook] Contract declined for loan:', loanId)
}

async function handleDocumentExpired(
  loanId: string,
  supabase: ReturnType<typeof createServiceRoleClient>
) {
  const { error } = await supabase
    .from('loans')
    .update({ contract_status: 'expired' })
    .eq('id', loanId)

  if (error) {
    throw new Error(`Failed to update loan status to expired: ${error.message}`)
  }
}
