'use client'

import { RouteError } from '@/components/shared/RouteError'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function BorrowerDetailError({ error, reset }: ErrorProps) {
  return (
    <RouteError
      error={error}
      reset={reset}
      title="Failed to load borrower"
      description={error.message || 'The borrower could not be found or an error occurred.'}
      backHref="/dashboard/borrowers"
      backLabel="Back to borrowers"
    />
  )
}
