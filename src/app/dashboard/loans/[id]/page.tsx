import Link from 'next/link'
import { notFound } from 'next/navigation'
import { LoanDetailClient } from '@/components/loans/LoanDetailClient'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { getLoanById } from '@/lib/data/loans.server'

interface LoanPageProps {
  params: Promise<{ id: string }>
}

export default async function LoanPage({ params }: LoanPageProps) {
  const { id } = await params
  const loan = await getLoanById(id)

  if (!loan) {
    notFound()
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Loan Detail"
        subtitle={`Loan for ${loan.borrower.full_name}`}
        action={
          <Button variant="outline" asChild>
            <Link href="/dashboard/loans">Back to Loans</Link>
          </Button>
        }
      />
      <LoanDetailClient initialData={loan} />
    </div>
  )
}
