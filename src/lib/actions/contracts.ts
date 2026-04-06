'use server'

import { revalidatePath } from 'next/cache'
import { type ActionState, actionError, actionSuccess } from '@/lib/actions'
import { formatContractData, generateContractPDF } from '@/lib/contracts/generator'
import { createAndSendDocument } from '@/lib/signwell/client'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import type { LoanFull } from '@/types'
import { withSentry } from './with-sentry'

// ─── generateAndSendContract ──────────────────────────────────────────────────

export const generateAndSendContract = withSentry(
  'generateAndSendContract',
  async (loanId: string): Promise<ActionState> => {
    // 1. Validate: authenticated user
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
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
      const totalReturned = (returns ?? []).reduce(
        (sum: number, r: { amount: number }) => sum + r.amount,
        0
      )
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
    const {
      data: { user },
    } = await supabase.auth.getUser()
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
      const totalReturned = (returns ?? []).reduce(
        (sum: number, r: { amount: number }) => sum + r.amount,
        0
      )
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
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const path = `contracts/${loanId}/${type}.pdf`
  const serviceClient = createServiceRoleClient()

  const { data, error } = await serviceClient.storage.from('contracts').createSignedUrl(path, 3600) // 1 hour

  if (error || !data?.signedUrl) {
    return { error: 'Could not generate download URL' }
  }

  return { url: data.signedUrl }
}
