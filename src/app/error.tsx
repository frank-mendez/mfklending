'use client'

import { RouteError } from '@/components/shared/RouteError'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function RootError({ error, reset }: ErrorProps) {
  return (
    <RouteError
      error={error}
      reset={reset}
      title="Something went wrong"
      description={error.message || 'An unexpected error occurred. Please try again.'}
      backHref="/dashboard"
      backLabel="Go to dashboard"
      fullHeight
    />
  )
}
