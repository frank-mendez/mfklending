'use client'

import { RouteError } from '@/components/shared/RouteError'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function LoanDetailError({ error, reset }: ErrorProps) {
  return (
    <RouteError
      error={error}
      reset={reset}
      title="Failed to load loan"
      description="Something went wrong. The loan may not exist."
      backHref="/dashboard/loans"
      backLabel="Back to loans"
    />
  )
}
