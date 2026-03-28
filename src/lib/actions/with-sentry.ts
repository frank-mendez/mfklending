/**
 * Wraps a Server Action with error capture.
 * TODO: Replace console.error with Sentry.captureException() once @sentry/nextjs is installed.
 */
import type { ActionState } from './index'

export function withSentry<T extends unknown[]>(
  actionName: string,
  fn: (...args: T) => Promise<ActionState>
) {
  return async (...args: T): Promise<ActionState> => {
    try {
      return await fn(...args)
    } catch (error) {
      // TODO: Sentry.captureException(error, { tags: { action: actionName } })
      console.error(`[${actionName}] Unhandled error:`, error)
      return {
        success: false,
        message: 'An unexpected error occurred. Please try again.',
      }
    }
  }
}
