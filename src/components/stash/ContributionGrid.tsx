'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import type { ContributionsByMonth } from '@/lib/data/stash'
import { formatPHP } from '@/lib/utils/currency'
import { formatManila } from '@/lib/utils/date'

const PARTNERS = ['Frank', 'Francis', 'Kim'] as const
const DEFAULT_VISIBLE = 24

interface ContributionGridProps {
  data: ContributionsByMonth[]
}

export function ContributionGrid({ data }: ContributionGridProps) {
  const [showAll, setShowAll] = useState(false)

  const visibleMonths = showAll ? data : data.slice(0, DEFAULT_VISIBLE)

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-md border overflow-x-auto">
        <TooltipProvider>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-32">Month</TableHead>
                {PARTNERS.map((name) => (
                  <TableHead key={name} className="text-center">
                    {name}
                  </TableHead>
                ))}
                <TableHead>Remarks</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleMonths.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    No contributions recorded yet.
                  </TableCell>
                </TableRow>
              ) : (
                visibleMonths.map(({ month, contributions }) => {
                  const partnerMap = new Map(contributions.map((c) => [c.partner_name, c]))
                  // Collect all remarks for this month
                  const allRemarks = contributions
                    .filter((c) => c.remarks)
                    .map((c) => `${c.partner_name}: ${c.remarks}`)
                    .join(' | ')

                  return (
                    <TableRow key={month}>
                      <TableCell className="font-medium tabular-nums">
                        {formatManila(`${month}-01`, 'MMM yyyy')}
                      </TableCell>
                      {PARTNERS.map((name) => {
                        const entry = partnerMap.get(name)
                        if (!entry) {
                          return (
                            <TableCell key={name} className="text-center text-muted-foreground">
                              —
                            </TableCell>
                          )
                        }
                        if (entry.remarks) {
                          return (
                            <TableCell key={name} className="text-center">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="cursor-help text-green-600 font-medium underline decoration-dotted">
                                    {formatPHP(entry.amount)}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-xs">
                                  <p>{entry.remarks}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TableCell>
                          )
                        }
                        return (
                          <TableCell key={name} className="text-center text-green-600 font-medium">
                            {formatPHP(entry.amount)}
                          </TableCell>
                        )
                      })}
                      <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                        {allRemarks || '—'}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </TooltipProvider>
      </div>

      {data.length > DEFAULT_VISIBLE && (
        <div className="flex justify-center">
          <Button variant="outline" size="sm" onClick={() => setShowAll((v) => !v)}>
            {showAll ? 'Show less' : `Load all (${data.length - DEFAULT_VISIBLE} more months)`}
          </Button>
        </div>
      )}
    </div>
  )
}
