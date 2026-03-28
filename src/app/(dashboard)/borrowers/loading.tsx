import { Skeleton } from '@/components/ui/skeleton'

const HEADER_COLS = ['n', 'e', 'p', 'l', 'j'] as const
const TABLE_ROWS = ['r1', 'r2', 'r3', 'r4', 'r5', 'r6'] as const
const ROW_COLS = ['c1', 'c2', 'c3', 'c4', 'c5'] as const

export default function BorrowersLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-56" />
      </div>

      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-9 w-32" />
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
  )
}
