'use client'

import { Bar, BarChart, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useCashFlow } from '@/hooks/use-dashboard'
import { formatPHP, toPesos } from '@/lib/utils/currency'

function formatYAxis(centavos: number): string {
  const pesos = toPesos(centavos)
  if (pesos >= 1000) return `₱${(pesos / 1000).toFixed(0)}k`
  return `₱${pesos.toFixed(0)}`
}

interface TooltipPayloadEntry {
  name: string
  value: number
  color: string
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: TooltipPayloadEntry[]
  label?: string
}) {
  if (!active || !payload?.length) return null

  return (
    <div className="rounded-lg border bg-background p-3 shadow-md text-sm">
      <p className="mb-2 font-semibold">{label}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-medium">{formatPHP(entry.value)}</span>
        </div>
      ))}
    </div>
  )
}

export function CashFlowChart() {
  const { data, isLoading } = useCashFlow(6)

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cash Flow (Last 6 Months)</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cash Flow (Last 6 Months)</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data ?? []} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
            <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis
              tickFormatter={formatYAxis}
              tick={{ fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              width={60}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '16px' }} />
            <Bar dataKey="interest" name="Interest" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            <Bar dataKey="principal" name="Principal" fill="#22c55e" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
