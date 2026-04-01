import { RemindersClient } from '@/components/reminders/RemindersClient'
import { getNotificationStats } from '@/lib/data/notifications'

export default async function RemindersPage() {
  const stats = await getNotificationStats()
  return <RemindersClient stats={stats} />
}
