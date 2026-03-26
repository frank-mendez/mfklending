import { differenceInDays, format, parseISO } from 'date-fns'
import { fromZonedTime, toZonedTime } from 'date-fns-tz'

const MANILA_TZ = 'Asia/Manila'

/**
 * Formats a UTC date string or Date object for display in Manila time.
 * @param date - UTC date string or Date object
 * @param fmt - date-fns format string (e.g. 'MMM d, yyyy')
 * @returns Formatted date string in Manila timezone
 */
export function formatManila(date: string | Date, fmt: string): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  const manilaDate = toZonedTime(d, MANILA_TZ)
  return format(manilaDate, fmt)
}

/**
 * Returns today's date in Manila timezone as a YYYY-MM-DD string.
 */
export function todayManila(): string {
  const nowInManila = toZonedTime(new Date(), MANILA_TZ)
  return format(nowInManila, 'yyyy-MM-dd')
}

/**
 * Checks if a due date (YYYY-MM-DD) is overdue relative to Manila today.
 * @param dueDate - Due date as YYYY-MM-DD string
 * @returns true if the due date is strictly before today in Manila time
 */
export function isOverdue(dueDate: string): boolean {
  const today = todayManila()
  return dueDate < today
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
