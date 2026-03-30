import { Skeleton } from '@/components/ui/skeleton'

export default function NewLoanLoading() {
  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8 flex items-center gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex flex-1 items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-4 w-24" />
            {i < 3 && <Skeleton className="h-px flex-1" />}
          </div>
        ))}
      </div>
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <Skeleton className="h-7 w-40 mb-2" />
        <Skeleton className="h-4 w-64 mb-6" />
        <div className="flex flex-col gap-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    </div>
  )
}
