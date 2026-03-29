'use client'

import { RouteError } from '@/components/shared/RouteError'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function StashError({ error, reset }: ErrorProps) {
  return (
    <RouteError
      error={error}
      reset={reset}
      title="Something went wrong"
      description={error.message || 'An unexpected error occurred loading the stash page.'}
      backHref="/dashboard"
      backLabel="Go to dashboard"
    />
  )
}
