import { PageHeader } from '@/components/shared/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { createClient } from '@/lib/supabase/server'
import { formatManila } from '@/lib/utils/date'
import type { ImportLog } from '@/types'

export default async function ImportHistoryPage() {
  const supabase = await createClient()

  const { data: logs } = await supabase
    .from('import_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)

  const importLogs = (logs ?? []) as ImportLog[]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Import History" subtitle="All past CSV imports" />

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>File</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Imported</TableHead>
                <TableHead className="text-right">Skipped</TableHead>
                <TableHead className="text-right">Errors</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {importLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                    No imports yet.
                  </TableCell>
                </TableRow>
              ) : (
                importLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm">
                      {formatManila(new Date(log.created_at), 'MMM d, yyyy HH:mm')}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {log.import_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-sm">{log.filename}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          log.status === 'completed'
                            ? 'default'
                            : log.status === 'failed'
                              ? 'destructive'
                              : 'secondary'
                        }
                      >
                        {log.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{log.rows_imported}</TableCell>
                    <TableCell className="text-right">{log.rows_skipped}</TableCell>
                    <TableCell className="text-right">
                      {log.errors ? (
                        <span className="text-destructive">{log.errors.length}</span>
                      ) : (
                        '0'
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
