'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  generateAndSendContract,
  getContractDownloadUrl,
  resendContract,
} from '@/lib/actions/contracts'
import { queryKeys } from '@/lib/query-keys'
import { formatManila } from '@/lib/utils/date'
import type { ContractStatus } from '@/types'

interface ContractSectionProps {
  loanId: string
  contractStatus: ContractStatus
  contractSentAt: string | null
  contractSignedAt: string | null
  contractSignedPdfPath: string | null
}

export function ContractSection({
  loanId,
  contractStatus,
  contractSentAt,
  contractSignedAt,
  contractSignedPdfPath,
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
      {isPending && <p className="text-xs text-muted-foreground animate-pulse">{loadingMessage}</p>}

      {/* Feedback messages */}
      {errorMsg && <p className="text-xs text-red-600">{errorMsg}</p>}
      {successMsg && <p className="text-xs text-green-600">{successMsg}</p>}

      {/* Actions */}
      <div className="flex flex-col gap-1.5 mt-1">
        {contractStatus === 'none' && (
          <>
            <Button size="sm" onClick={handleGenerate} disabled={isPending}>
              {isPending ? loadingMessage : 'Generate & Send Contract'}
            </Button>
            <Button size="sm" variant="ghost" asChild>
              <a href={`/loans/${loanId}/contract`}>Preview Contract</a>
            </Button>
          </>
        )}

        {contractStatus === 'pending_signature' && (
          <>
            <Button size="sm" variant="outline" onClick={handleResend} disabled={isPending}>
              Resend Contract
            </Button>
            <Button size="sm" variant="ghost" onClick={() => handleDownload('unsigned')}>
              View Unsigned Contract
            </Button>
          </>
        )}

        {contractStatus === 'signed' && (
          <Button
            size="sm"
            onClick={() => handleDownload('signed')}
            disabled={!contractSignedPdfPath}
            title={!contractSignedPdfPath ? 'Signed PDF not yet available' : undefined}
          >
            Download Signed Contract
          </Button>
        )}

        {(contractStatus === 'declined' || contractStatus === 'expired') && (
          <Button size="sm" onClick={handleResend} disabled={isPending}>
            {isPending ? loadingMessage : 'Resend Contract'}
          </Button>
        )}
      </div>
    </div>
  )
}
