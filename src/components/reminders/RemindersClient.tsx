'use client'

import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, Bell, CheckCircle2, Loader2, Play, RefreshCw } from 'lucide-react'
import { useActionState } from 'react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { triggerRemindersManually } from '@/lib/actions/reminders'
import { queryKeys } from '@/lib/query-keys'
import { formatManila } from '@/lib/utils/date'
import type { NotificationLog, NotificationTypeEnum } from '@/types'

interface NotificationLogWithBorrower extends NotificationLog {
  borrower_name: string | null
}

interface NotificationStats {
  sentToday: number
  sentThisMonth: number
  failedTotal: number
  activeReminders: number
}

interface RemindersClientProps {
  stats: NotificationStats
}

const NOTIFICATION_TYPE_LABELS: Record<NotificationTypeEnum, string> = {
  reminder_3day: '3-Day Reminder',
  reminder_1day: '1-Day Reminder',
  reminder_due: 'Due Today',
  overdue_1day: '1 Day Overdue',
  overdue_7day: '7 Days Overdue',
  overdue_weekly: 'Weekly Overdue',
}

function getTypeBadgeClass(type: NotificationTypeEnum): string {
  if (type === 'reminder_3day' || type === 'reminder_1day' || type === 'reminder_due') {
    return 'bg-blue-100 text-blue-800 border-blue-200'
  }
  if (type === 'overdue_1day') {
    return 'bg-orange-100 text-orange-800 border-orange-200'
  }
  return 'bg-red-100 text-red-800 border-red-200'
}

function getChannelBadgeClass(channel: 'email' | 'sms'): string {
  if (channel === 'email') return 'bg-blue-100 text-blue-800 border-blue-200'
  return 'bg-green-100 text-green-800 border-green-200'
}

function getStatusBadgeClass(status: 'pending' | 'sent' | 'failed'): string {
  if (status === 'sent') return 'bg-green-100 text-green-800 border-green-200'
  if (status === 'failed') return 'bg-red-100 text-red-800 border-red-200'
  return 'bg-yellow-100 text-yellow-800 border-yellow-200'
}

async function fetchNotificationLogs(): Promise<NotificationLogWithBorrower[]> {
  const response = await fetch('/api/notification-logs')
  if (!response.ok) throw new Error('Failed to fetch notification logs')
  return response.json() as Promise<NotificationLogWithBorrower[]>
}

const initialActionState = { success: false, message: '' }

export function RemindersClient({ stats }: RemindersClientProps) {
  const [actionState, formAction, isPending] = useActionState(
    triggerRemindersManually,
    initialActionState
  )

  const {
    data: logs,
    isLoading,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: queryKeys.notifications.recent(),
    queryFn: fetchNotificationLogs,
    refetchInterval: 30 * 1000,
  })

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Reminders"
          subtitle="Automated payment reminders sent to borrowers via email and SMS"
          action={
            <form action={formAction}>
              <Button type="submit" disabled={isPending} className="gap-2">
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                {isPending ? 'Running...' : 'Run Now'}
              </Button>
            </form>
          }
        />

        {/* Action feedback */}
        {actionState.message && (
          <div
            className={`flex items-center gap-2 rounded-md border px-4 py-3 text-sm ${
              actionState.success
                ? 'border-green-200 bg-green-50 text-green-800'
                : 'border-red-200 bg-red-50 text-red-800'
            }`}
          >
            {actionState.success ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <AlertTriangle className="h-4 w-4 shrink-0" />
            )}
            {actionState.message}
          </div>
        )}

        {/* Stats cards */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Sent Today
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.sentToday}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Sent This Month
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.sentThisMonth}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Failed Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold ${stats.failedTotal > 0 ? 'text-red-600' : ''}`}>
                {stats.failedTotal}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Active Reminders
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.activeReminders}</p>
            </CardContent>
          </Card>
        </div>

        {/* Notification log */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Bell className="h-4 w-4" />
                Recent Notifications
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => refetch()}
                disabled={isFetching}
                className="gap-2 text-muted-foreground"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="space-y-2 p-6">
                {['sk-1', 'sk-2', 'sk-3', 'sk-4', 'sk-5'].map((key) => (
                  <Skeleton key={key} className="h-10 w-full" />
                ))}
              </div>
            ) : !logs || logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
                <Bell className="h-8 w-8 opacity-40" />
                <p className="text-sm">No notifications sent yet.</p>
                <p className="text-xs">Run the reminder pipeline or wait for the cron job.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Borrower</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Channel</TableHead>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Sent At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium">{log.borrower_name ?? '—'}</TableCell>
                      <TableCell>
                        <Badge className={getTypeBadgeClass(log.notification_type)}>
                          {NOTIFICATION_TYPE_LABELS[log.notification_type]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getChannelBadgeClass(log.channel)}>
                          {log.channel.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[180px] truncate text-muted-foreground text-sm">
                        {log.recipient}
                      </TableCell>
                      <TableCell>
                        {log.status === 'failed' && log.error ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge className={`${getStatusBadgeClass(log.status)} cursor-help`}>
                                {log.status}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs break-words">
                              <p>{log.error}</p>
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <Badge className={getStatusBadgeClass(log.status)}>{log.status}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                        {log.sent_at
                          ? formatManila(log.sent_at, 'MMM d, yyyy h:mm a')
                          : formatManila(log.created_at, 'MMM d, yyyy h:mm a')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  )
}
