import { cn } from '@/lib/utils'
import { formatPHP } from '@/lib/utils/currency'

interface CurrencyDisplayProps {
  centavos: number
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export function CurrencyDisplay({ centavos, className, size = 'md' }: CurrencyDisplayProps) {
  return (
    <span
      className={cn(
        {
          'text-sm text-muted-foreground': size === 'sm',
          'text-base': size === 'md',
          'text-2xl font-bold': size === 'lg',
        },
        className
      )}
    >
      {formatPHP(centavos)}
    </span>
  )
}
