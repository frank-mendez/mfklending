'use client'

import { RouteError } from '@/components/shared/RouteError'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function BorrowersError({ error, reset }: ErrorProps) {
  return (
    <RouteError
      error={error}
      reset={reset}
      title="Failed to load borrowers"
      description={error.message || 'An unexpected error occurred.'}
      backHref="/dashboard"
      backLabel="Go to dashboard"
    />
  )
}
