'use client'

import { Bar, BarChart, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatPHP, toPesos } from '@/lib/utils/currency'
import type { InterestEarnedRow } from '@/types'

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

function formatYAxis(centavos: number): string {
  const pesos = toPesos(centavos)
  if (pesos >= 1000) return `₱${(pesos / 1000).toFixed(0)}k`
  return `₱${pesos.toFixed(0)}`
}

interface InterestEarnedChartProps {
  data: InterestEarnedRow[]
}

export function InterestEarnedChart({ data }: InterestEarnedChartProps) {
  const chartData = data.map((row) => ({
    period: row.period,
    interest: row.interestCollected,
    penalties: row.penaltiesCollected,
  }))

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={chartData} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
        <XAxis dataKey="period" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
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
        <Bar dataKey="penalties" name="Penalties" fill="#f97316" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
