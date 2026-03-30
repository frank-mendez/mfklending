import { Info } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageHeader } from '@/components/shared/PageHeader'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { getTransactions } from '@/lib/data/transactions.server'
import { formatPHP } from '@/lib/utils/currency'
import { formatManila } from '@/lib/utils/date'

export default async function TransactionsPage() {
  const transactions = await getTransactions()

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Bank Transactions" subtitle="GoTyme Bank transaction history." />

      {/* Info banner */}
      <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          GoTyme Bank CSV import coming in Phase 7. Transactions recorded manually during payment
          recording will appear here.
        </p>
      </div>

      {transactions.length === 0 ? (
        <EmptyState
          title="No transactions yet"
          description="Transactions recorded during payment processing will appear here."
        />
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Reference</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell className="tabular-nums whitespace-nowrap">
                    {formatManila(tx.transaction_date, 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell className="max-w-xs truncate">{tx.description}</TableCell>
                  <TableCell className="text-right tabular-nums font-medium">
                    {formatPHP(tx.amount)}
                  </TableCell>
                  <TableCell>
                    {tx.type === 'credit' ? (
                      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                        Credit
                      </Badge>
                    ) : (
                      <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Debit</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm capitalize">
                    {tx.source === 'gotyme_import' ? 'GoTyme Import' : 'Manual'}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm tabular-nums">
                    {tx.reference_no ?? '—'}
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
