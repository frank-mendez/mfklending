'use client'

/**
 * Sets the Sentry user context for error tracking.
 * TODO: Install @sentry/nextjs and uncomment the Sentry calls below.
 */
import { useEffect } from 'react'

export function SentryUserProvider({ userId, email }: { userId: string; email: string }) {
  // biome-ignore lint/correctness/useExhaustiveDependencies: Sentry placeholder — no-op until @sentry/nextjs is installed
  useEffect(() => {
    // Sentry.setUser({ id: userId, email })
    // return () => { Sentry.setUser(null) }
  }, [userId, email])

  return null
}
