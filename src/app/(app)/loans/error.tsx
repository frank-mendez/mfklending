'use client'

import { RouteError } from '@/components/shared/RouteError'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function LoansError({ error, reset }: ErrorProps) {
  return (
    <RouteError
      error={error}
      reset={reset}
      title="Failed to load loans"
      description="Something went wrong. Please try again."
      backHref="/"
      backLabel="Go to dashboard"
    />
  )
}
