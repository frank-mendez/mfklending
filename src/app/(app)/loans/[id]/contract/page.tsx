import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ContractPreviewActions } from '@/components/loans/ContractPreviewActions'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { formatContractData } from '@/lib/contracts/generator'
import { getLoanById } from '@/lib/data/loans.server'
import { createClient } from '@/lib/supabase/server'
import { formatPHP } from '@/lib/utils/currency'

interface ContractPageProps {
  params: Promise<{ id: string }>
}

export default async function ContractPreviewPage({ params }: ContractPageProps) {
  const { id } = await params
  const loan = await getLoanById(id)

  if (!loan) notFound()

  // For hybrid_diminishing loans, compute outstanding balance from principal_returns
  let outstandingBalance: number | undefined
  if (loan.loan_type === 'hybrid_diminishing') {
    const supabase = await createClient()
    const { data: returns } = await supabase
      .from('principal_returns')
      .select('amount')
      .eq('loan_id', id)
    const totalReturned = (returns ?? []).reduce(
      (sum: number, r: { amount: number }) => sum + r.amount,
      0
    )
    outstandingBalance = Math.max(0, loan.principal - totalReturned)
  }

  const data = formatContractData(loan, outstandingBalance)
  const totalInterest = data.monthlyInterestCentavos * data.termMonths

  return (
    <div className="flex flex-col gap-6 max-w-3xl mx-auto">
      <PageHeader
        title="Contract Preview"
        subtitle={`Review before sending to ${loan.borrower.full_name}`}
        action={
          <Button variant="outline" asChild>
            <Link href={`/loans/${id}`}>← Back</Link>
          </Button>
        }
      />

      <div className="rounded-xl border bg-card p-8 shadow-sm prose prose-sm max-w-none">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-black tracking-widest mb-1">MFK</h1>
          <p className="text-xs tracking-widest uppercase text-muted-foreground">Lending Corp</p>
          <hr className="my-4" />
          <h2 className="text-base font-bold">
            MFK Lending Corporation — Lending Agreement and Borrower Criteria
          </h2>
        </div>

        {/* Intro */}
        <p className="text-sm text-justify">
          This Lending Agreement (&quot;Agreement&quot;) outlines the criteria and terms for
          borrowing from MFK Lending Corporation (&quot;Lender&quot;). Please read this Agreement
          carefully. By applying for and accepting a loan from MFK Lending Corporation, you
          acknowledge and agree to the following terms and conditions:
        </p>

        {/* Section 1 */}
        <h3 className="font-bold mt-6">1. Personal Information:</h3>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <div>
            <span className="font-semibold">Full Name:</span> {data.borrowerFullName}
          </div>
          <div>
            <span className="font-semibold">Age:</span> {data.borrowerAge}
          </div>
          <div>
            <span className="font-semibold">Occupation:</span> {data.borrowerOccupation}
          </div>
          <div>
            <span className="font-semibold">Contact Number:</span> {data.borrowerPhone}
          </div>
          <div className="col-span-2">
            <span className="font-semibold">Email:</span> {data.borrowerEmail}
          </div>
        </div>

        {/* Section 2 */}
        <h3 className="font-bold mt-6">2. Loan Application Requirements:</h3>
        <div className="text-sm space-y-1">
          <div>
            <span className="font-semibold">Loan Purpose:</span> {data.loanPurpose ?? '—'}
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded px-3 py-2 font-bold">
            Initial Loan Amount: {formatPHP(data.principalCentavos)}
          </div>
          <p className="font-semibold mt-3">Online Bank Account Information</p>
          <div>
            <span className="font-semibold">Bank:</span> {data.borrowerBank}
          </div>
          <div>
            <span className="font-semibold">Account Name:</span> {data.borrowerAccountName}
          </div>
          <div>
            <span className="font-semibold">Account Number:</span> {data.borrowerAccountNumber}
          </div>
          <p className="italic text-xs text-muted-foreground mt-1">
            Borrower must possess a valid online bank account for loan disbursement and repayment.
          </p>
        </div>

        {/* Section 3 */}
        <h3 className="font-bold mt-6">3. Loan Terms and Conditions:</h3>
        <div className="text-sm space-y-3">
          <div className="bg-yellow-50 border border-yellow-200 rounded px-3 py-2 font-bold">
            Monthly Interest: The interest is calculated at a rate of{' '}
            {(data.interestRate * 100).toFixed(0)}% per month, on the outstanding loan balance for a{' '}
            {data.termMonths}-month loan term.
          </div>
          <div className="border-2 border-gray-800 rounded p-4 text-center space-y-1">
            <div className="font-bold">Bank: {data.mfkBankName}</div>
            <div className="font-bold">Account Name: {data.mfkAccountName}</div>
            <div className="font-bold">Account Number: {data.mfkAccountNumber}</div>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded px-3 py-2 font-bold">
            Loan Term: The loan term is for {data.termMonths} month(s). Borrower agrees to repay the
            total loan amount (principal) at the end of the term.
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded px-3 py-2 font-bold">
            At the end of the loan term, MFK receives a total sum of{' '}
            {formatPHP(data.totalRepaymentCentavos)} — which is {formatPHP(data.principalCentavos)}{' '}
            (principal) and {formatPHP(totalInterest)} (interest @{' '}
            {formatPHP(data.monthlyInterestCentavos)} per month).
          </div>
        </div>

        {/* Section 4 */}
        <h3 className="font-bold mt-6">4. Loan Amount Increase:</h3>
        <p className="text-sm">
          MFK Lending Corporation reserves the right to increase or decrease the loan amount based
          on the borrower&apos;s repayment history and creditworthiness. Any changes will be
          communicated in advance and require a new written agreement.
        </p>

        {/* Section 5 */}
        <h3 className="font-bold mt-6">5. Repayment, Penalties and Communication:</h3>
        <div className="text-sm space-y-2">
          <div className="bg-yellow-50 border border-yellow-200 rounded px-3 py-2 font-bold">
            Late Payment Penalty: 1% per day of the accrued interest for each day of delayed
            payment.
          </div>
          <p>
            Total Amount Due: In the event of late payment, the borrower shall pay the outstanding
            principal, all accrued interest, and any applicable late payment penalties.
          </p>
          <p>
            Communication: The borrower agrees to maintain open communication regarding any
            difficulties in meeting payment obligations.
          </p>
        </div>

        {/* Section 6 */}
        <h3 className="font-bold mt-6">6. Miscellaneous:</h3>
        <div className="text-sm space-y-2">
          <p>
            <strong>Data Privacy:</strong> MFK Lending Corporation will handle all personal
            information in accordance with the Data Privacy Act of 2012 (Republic Act 10173).
          </p>
          <p>
            <strong>Agreement Changes:</strong> MFK Lending Corporation reserves the right to modify
            this Agreement. Borrowers will be notified at least 30 days in advance.
          </p>
          <p>
            <strong>Dispute Resolution:</strong> Any disputes shall be resolved through mutual
            discussion. If unresolved, disputes may be escalated to appropriate legal authorities.
          </p>
        </div>

        {/* Signature block */}
        <div className="mt-8 pt-6 border-t">
          <p className="text-sm">
            By accepting this Agreement, the Borrower acknowledges and agrees to all the terms and
            conditions specified above.
          </p>
          <div className="mt-4">
            <div className="w-56 border-b border-gray-800 mb-1" />
            <p className="text-xs text-muted-foreground">Borrower Signature</p>
          </div>
          <p className="text-sm mt-3">
            <strong>Date:</strong> {data.documentDate}
          </p>
          <p className="text-xs text-muted-foreground mt-4">Document ID: {data.loanId}</p>
        </div>
      </div>

      {/* Send button */}
      <ContractPreviewActions loanId={id} contractStatus={loan.contract_status} />
    </div>
  )
}
