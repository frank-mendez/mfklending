'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
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
    return (
      <p className="text-sm text-muted-foreground text-center">
        This contract has already been signed.
      </p>
    )
  }

  if (contractStatus === 'pending_signature') {
    return (
      <p className="text-sm text-muted-foreground text-center">Contract is awaiting signature.</p>
    )
  }

  return (
    <div className="flex flex-col items-center gap-2 pb-8">
      {message && (
        <p className={`text-sm ${message.ok ? 'text-green-600' : 'text-red-600'}`}>
          {message.text}
        </p>
      )}
      <Button size="lg" onClick={handleSend} disabled={isPending}>
        {isPending ? 'Sending...' : 'Send for Signature'}
      </Button>
      <p className="text-xs text-muted-foreground">
        This will generate the PDF and send it to the borrower&apos;s email for e-signature.
      </p>
    </div>
  )
}
