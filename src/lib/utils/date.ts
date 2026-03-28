import { differenceInDays, format } from 'date-fns'
import { fromZonedTime, toZonedTime } from 'date-fns-tz'

const MANILA_TZ = 'Asia/Manila'

/**
 * Parses a string as a UTC instant.
 *
 * parseISO() treats timezone-less strings (e.g. "2024-01-15T10:00:00") as
 * local time, which breaks when the runtime is not in UTC. Using
 * fromZonedTime(str, 'UTC') instead explicitly declares the string as UTC
 * regardless of the host timezone.
 *
 * Strings that already carry an offset (Z / +HH:mm) are handled correctly by
 * both approaches, so this is safe for Supabase timestamptz values too.
 */
function parseUTC(date: string): Date {
  return fromZonedTime(date, 'UTC')
}

/**
 * Formats a UTC date string or Date object for display in Manila time.
 * @param date - UTC instant: a Date object, an ISO string with timezone info
 *               (e.g. "2024-01-15T10:00:00Z"), or a naive string that will be
 *               treated as UTC (e.g. "2024-01-15" or "2024-01-15T10:00:00")
 * @param fmt - date-fns format string (e.g. 'MMM d, yyyy')
 * @returns Formatted date string in Asia/Manila timezone
 */
export function formatManila(date: string | Date, fmt: string): string {
  const utc = typeof date === 'string' ? parseUTC(date) : date
  return format(toZonedTime(utc, MANILA_TZ), fmt)
}

/**
 * Returns today's date in Manila timezone as a YYYY-MM-DD string.
 */
export function todayManila(): string {
  return format(toZonedTime(new Date(), MANILA_TZ), 'yyyy-MM-dd')
}

/**
 * Returns the current month in Manila timezone as a YYYY-MM string.
 * Use this instead of new Date().toISOString().slice(0, 7), which is UTC-based
 * and can show the wrong month around midnight on month boundaries.
 */
export function currentMonthManila(): string {
  return format(toZonedTime(new Date(), MANILA_TZ), 'yyyy-MM')
}

/**
 * Checks if a due date (YYYY-MM-DD) is overdue relative to Manila today.
 * @param dueDate - Due date as YYYY-MM-DD string
 * @returns true if the due date is strictly before today in Manila time
 */
export function isOverdue(dueDate: string): boolean {
  return dueDate < todayManila()
}

/**
 * Counts how many days overdue a due date is relative to Manila today.
 * @param dueDate - Due date as YYYY-MM-DD string
 * @returns Number of days overdue (0 if not overdue)
 */
export function daysOverdue(dueDate: string): number {
  if (!isOverdue(dueDate)) return 0

  const dueDateUtc = fromZonedTime(`${dueDate}T00:00:00`, MANILA_TZ)
  const todayUtc = fromZonedTime(`${todayManila()}T00:00:00`, MANILA_TZ)

  return differenceInDays(todayUtc, dueDateUtc)
}
