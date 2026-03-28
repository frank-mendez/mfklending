import { Skeleton } from '@/components/ui/skeleton'

const SCHEDULE_ROWS = ['s1', 's2', 's3', 's4'] as const

export default function LoanDetailLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-52" />
        </div>
        <Skeleton className="h-9 w-32" />
      </div>

      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-3">
          <div className="flex gap-3">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-6 w-16" />
          </div>
          <Skeleton className="h-4 w-56" />
        </div>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="flex flex-1 flex-col gap-6">
          <Skeleton className="h-6 w-36" />
          <div className="rounded-lg border p-4">
            {SCHEDULE_ROWS.map((row) => (
              <div key={row} className="flex items-center gap-4 py-3">
                <Skeleton className="h-4 w-8" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-5 w-16" />
                <Skeleton className="ml-auto h-8 w-28" />
              </div>
            ))}
          </div>
        </div>
        <div className="lg:w-72">
          <Skeleton className="h-56 w-full rounded-xl" />
        </div>
      </div>
    </div>
  )
}
