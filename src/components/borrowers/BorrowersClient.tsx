'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { BorrowerFormDialog } from '@/components/borrowers/BorrowerFormDialog'
import { EmptyState } from '@/components/shared/EmptyState'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useBorrowers } from '@/hooks/use-borrowers'
import type { BorrowerWithLoanCount } from '@/lib/data/borrowers'
import { formatManila } from '@/lib/utils/date'

interface BorrowersClientProps {
  initialData: BorrowerWithLoanCount[]
}

export function BorrowersClient({ initialData }: BorrowersClientProps) {
  const { data: borrowers = initialData } = useBorrowers()

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search)
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [search])

  const filtered = debouncedSearch
    ? borrowers.filter(
        (b) =>
          b.full_name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
          b.email.toLowerCase().includes(debouncedSearch.toLowerCase())
      )
    : borrowers

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <Input
          placeholder="Search by name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <BorrowerFormDialog />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No borrowers found"
          description={
            debouncedSearch
              ? `No borrowers match "${debouncedSearch}".`
              : 'Add a borrower to get started.'
          }
          action={!debouncedSearch ? <BorrowerFormDialog /> : undefined}
        />
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="hidden sm:table-cell">Email</TableHead>
                <TableHead className="hidden md:table-cell">Phone</TableHead>
                <TableHead>Active Loans</TableHead>
                <TableHead className="hidden lg:table-cell">Joined</TableHead>
                <TableHead className="w-16" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((borrower) => (
                <TableRow key={borrower.id}>
                  <TableCell className="font-medium">{borrower.full_name}</TableCell>
                  <TableCell className="hidden sm:table-cell text-muted-foreground">
                    {borrower.email}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">
                    {borrower.phone}
                  </TableCell>
                  <TableCell>
                    {borrower.activeLoansCount > 0 ? (
                      <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 border-transparent">
                        {borrower.activeLoansCount}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-muted-foreground text-sm">
                    {formatManila(borrower.created_at, 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell>
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/dashboard/borrowers/${borrower.id}`}>View</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
