import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

type StatusValue = 'active' | 'paid' | 'defaulted' | 'overdue' | 'pending' | 'late'

interface StatusBadgeProps {
  status: StatusValue
}

const statusStyles: Record<StatusValue, string> = {
  active: 'border-transparent bg-blue-100 text-blue-800 hover:bg-blue-100',
  paid: 'border-transparent bg-green-100 text-green-800 hover:bg-green-100',
  overdue: 'border-transparent bg-red-100 text-red-800 hover:bg-red-100',
  defaulted: 'border-transparent bg-orange-100 text-orange-800 hover:bg-orange-100',
  pending: 'border-transparent bg-yellow-100 text-yellow-800 hover:bg-yellow-100',
  late: 'border-red-400 text-red-700 bg-transparent hover:bg-red-50',
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const label = status.charAt(0).toUpperCase() + status.slice(1)

  return (
    <Badge variant={status === 'late' ? 'outline' : 'default'} className={cn(statusStyles[status])}>
      {label}
    </Badge>
  )
}
