import { BorrowersClient } from '@/components/borrowers/BorrowersClient'
import { PageHeader } from '@/components/shared/PageHeader'
import { getBorrowers } from '@/lib/data/borrowers'

export default async function BorrowersPage() {
  const borrowers = await getBorrowers()

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Borrowers" subtitle="Manage all registered borrowers" />
      <BorrowersClient initialData={borrowers} />
    </div>
  )
}
