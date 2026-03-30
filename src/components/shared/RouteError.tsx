'use client'

import { AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

interface RouteErrorProps {
  error: Error & { digest?: string }
  reset: () => void
  title: string
  description: string
  backHref: string
  backLabel: string
  /** Show the AlertCircle icon header. Default: true */
  showIcon?: boolean
  /** Use min-h-screen layout for root-level error pages. Default: false */
  fullHeight?: boolean
}

export function RouteError({
  error,
  reset,
  title,
  description,
  backHref,
  backLabel,
  showIcon = true,
  fullHeight = false,
}: RouteErrorProps) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div
      className={`flex flex-col items-center justify-center gap-4 text-center ${
        fullHeight ? 'min-h-screen p-6' : 'py-16'
      }`}
    >
      {showIcon && (
        <div className="rounded-full bg-red-100 p-4">
          <AlertCircle className="h-8 w-8 text-red-600" />
        </div>
      )}
      <div className="flex flex-col gap-1">
        <p className={`font-semibold ${fullHeight ? 'text-xl' : 'text-lg'}`}>{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="flex gap-3">
        <Button onClick={reset} variant="default">
          Try again
        </Button>
        <Button asChild variant="outline">
          <Link href={backHref}>{backLabel}</Link>
        </Button>
      </div>
    </div>
  )
}
