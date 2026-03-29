import Link from 'next/link'
import { LoansClient } from '@/components/loans/LoansClient'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { getLoans } from '@/lib/data/loans.server'

export default async function LoansPage() {
  const loans = await getLoans()

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Loans"
        subtitle="Manage all active and historical loans."
        action={
          <Button asChild>
            <Link href="/loans/new">New Loan</Link>
          </Button>
        }
      />
      <LoansClient initialData={loans} />
    </div>
  )
}
