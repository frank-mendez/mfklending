'use client'

import { AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function BorrowerDetailError({ error, reset }: ErrorProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
      <div className="rounded-full bg-red-100 p-4">
        <AlertCircle className="h-8 w-8 text-red-600" />
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-lg font-semibold">Failed to load borrower</p>
        <p className="text-sm text-muted-foreground">
          {error.message || 'The borrower could not be found or an error occurred.'}
        </p>
      </div>
      <div className="flex gap-3">
        <Button onClick={reset} variant="default">
          Try again
        </Button>
        <Button asChild variant="outline">
          <Link href="/dashboard/borrowers">Back to borrowers</Link>
        </Button>
      </div>
    </div>
  )
}
