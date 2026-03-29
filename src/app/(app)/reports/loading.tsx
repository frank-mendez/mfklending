import { Skeleton } from '@/components/ui/skeleton'

const CARD_KEYS = ['interest', 'loanbook', 'equity', 'dividends'] as const

export default function ReportsLoading() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-4 w-64" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {CARD_KEYS.map((k) => (
          <Skeleton key={k} className="h-36 w-full rounded-xl" />
        ))}
      </div>

      <div className="flex flex-col gap-3">
        <Skeleton className="h-6 w-36" />
        <Skeleton className="h-20 w-full rounded-md" />
      </div>
    </div>
  )
}
