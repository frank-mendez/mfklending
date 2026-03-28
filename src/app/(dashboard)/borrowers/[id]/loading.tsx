import { Skeleton } from '@/components/ui/skeleton'

const HEADER_COLS = ['h1', 'h2', 'h3', 'h4', 'h5'] as const
const TABLE_ROWS = ['r1', 'r2', 'r3', 'r4'] as const
const ROW_COLS = ['c1', 'c2', 'c3', 'c4', 'c5'] as const

export default function BorrowerDetailLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-2" />
        <Skeleton className="h-4 w-32" />
      </div>

      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-36" />
        </div>
        <Skeleton className="h-9 w-20" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Skeleton className="h-96 rounded-xl" />

        <div className="flex flex-col gap-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <Skeleton className="h-7 w-32" />
            <Skeleton className="h-9 w-28" />
          </div>
          <div className="rounded-lg border">
            <div className="border-b p-3">
              <div className="grid grid-cols-5 gap-4">
                {HEADER_COLS.map((k) => (
                  <Skeleton key={k} className="h-4 w-full" />
                ))}
              </div>
            </div>
            {TABLE_ROWS.map((row) => (
              <div key={row} className="border-b p-3 last:border-0">
                <div className="grid grid-cols-5 gap-4">
                  {ROW_COLS.map((col) => (
                    <Skeleton key={col} className="h-4 w-full" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
