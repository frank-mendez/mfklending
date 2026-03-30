'use client'

import { RouteError } from '@/components/shared/RouteError'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function DashboardError({ error, reset }: ErrorProps) {
  return (
    <RouteError
      error={error}
      reset={reset}
      title="Something went wrong"
      description={error.message || 'An unexpected error occurred loading the dashboard.'}
      backHref="/"
      backLabel="Go to dashboard"
    />
  )
}
