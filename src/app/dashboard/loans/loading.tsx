import { Skeleton } from '@/components/ui/skeleton'

const TABLE_ROWS = ['r1', 'r2', 'r3', 'r4', 'r5', 'r6'] as const

export default function LoansLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-9 w-28" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-9 w-48" />
      </div>
      <div className="rounded-lg border">
        <div className="p-4">
          {TABLE_ROWS.map((row) => (
            <div key={row} className="flex items-center gap-4 py-3">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="ml-auto h-8 w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
