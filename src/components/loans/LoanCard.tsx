import Link from 'next/link'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { formatPHP } from '@/lib/utils/currency'
import { formatManila } from '@/lib/utils/date'
import type { LoanWithBorrower } from '@/types'

interface LoanCardProps {
  loan: LoanWithBorrower
}

export function LoanCard({ loan }: LoanCardProps) {
  const isPaid = loan.status === 'paid'

  const dueDateLabel = isPaid ? 'Paid' : formatManila(loan.end_date, 'MMM d, yyyy')

  return (
    <Link href={`/dashboard/loans/${loan.id}`} className="block">
      <Card
        className={cn(
          'cursor-pointer transition-all hover:shadow-md hover:border-foreground/20',
          isPaid && 'opacity-75'
        )}
      >
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold leading-tight">{loan.borrower.full_name}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {isPaid ? 'Paid' : `Due: ${dueDateLabel}`}
              </p>
            </div>
            <StatusBadge status={loan.status} />
          </div>

          <div className="mt-4 flex items-center justify-between gap-2">
            <p className="text-xl font-bold">{formatPHP(loan.principal)}</p>
            <Badge
              variant="outline"
              className={cn(
                loan.loan_type === 'flat_interest'
                  ? 'border-blue-400 text-blue-700'
                  : 'border-purple-400 text-purple-700'
              )}
            >
              {loan.loan_type === 'flat_interest' ? 'Flat Interest' : 'Diminishing'}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
