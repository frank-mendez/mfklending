'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function LoanDetailError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      <p className="text-lg font-semibold">Failed to load loan</p>
      <p className="text-sm text-muted-foreground">Something went wrong. The loan may not exist.</p>
      <div className="flex gap-2">
        <Button variant="outline" onClick={reset}>
          Retry
        </Button>
        <Button asChild>
          <Link href="/dashboard/loans">Back to Loans</Link>
        </Button>
      </div>
    </div>
  )
}
