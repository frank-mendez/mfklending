import { Skeleton } from '@/components/ui/skeleton'

const TABLE_ROWS = ['t1', 't2', 't3', 't4', 't5', 't6', 't7', 't8'] as const

export default function TransactionsLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>

      <Skeleton className="h-12 w-full rounded-lg" />

      <div className="rounded-lg border">
        <div className="p-4">
          {TABLE_ROWS.map((row) => (
            <div key={row} className="flex items-center gap-4 border-b py-3 last:border-0">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-48" />
              <Skeleton className="ml-auto h-4 w-24" />
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-28" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
