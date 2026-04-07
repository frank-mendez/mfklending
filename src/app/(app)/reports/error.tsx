'use client'

import { RouteError } from '@/components/shared/RouteError'

export default function ReportsError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <RouteError
      error={error}
      reset={reset}
      title="Could not load reports"
      description="There was a problem fetching report data. Please try again."
      backHref="/"
      backLabel="Back to Dashboard"
    />
  )
}
