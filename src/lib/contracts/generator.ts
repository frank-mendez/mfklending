/**
 * Contract PDF generation for MFK Lending Corp.
 * SERVER-SIDE ONLY — never import in client components.
 */
import { renderToBuffer } from '@react-pdf/renderer'
import { format } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'
import type { ReactElement } from 'react'
import { createElement } from 'react'
import { calcFlatTotalRepayment, calcMonthlyInterest } from '@/lib/finance'
import type { ContractData, LoanFull } from '@/types'
import { ContractPDF } from './ContractPDF'

const MANILA_TZ = 'Asia/Manila'

// Static MFK business constants
const MFK_BANK_NAME = 'GoTyme Bank'
const MFK_ACCOUNT_NAME = 'MFK Lending Corp'
const MFK_ACCOUNT_NUMBER = '014721202843'

/**
 * Formats a LoanFull (with borrower) into the ContractData shape for PDF generation.
 *
 * @param loan - Full loan record with borrower joined
 * @param outstandingBalanceCentavos - For hybrid_diminishing: override principal with remaining balance.
 *   If not provided for hybrid loans, falls back to loan.principal.
 */
export function formatContractData(
  loan: LoanFull,
  outstandingBalanceCentavos?: number
): ContractData {
  const principalCentavos =
    loan.loan_type === 'hybrid_diminishing' && outstandingBalanceCentavos !== undefined
      ? outstandingBalanceCentavos
      : loan.principal

  const monthlyInterestCentavos = calcMonthlyInterest(principalCentavos, loan.interest_rate)
  const totalRepaymentCentavos = calcFlatTotalRepayment(
    principalCentavos,
    loan.interest_rate,
    loan.term_months
  )

  // Format document date in Manila time
  const nowManila = toZonedTime(new Date(), MANILA_TZ)
  const documentDate = format(nowManila, 'MMMM d, yyyy')

  return {
    borrowerFullName: loan.borrower.full_name,
    borrowerAge: loan.borrower.age ?? 0,
    borrowerOccupation: loan.borrower.occupation ?? '',
    borrowerPhone: loan.borrower.phone ?? '',
    borrowerEmail: loan.borrower.email,
    borrowerBank: loan.borrower.bank_name ?? '',
    borrowerAccountName: loan.borrower.account_name ?? '',
    borrowerAccountNumber: loan.borrower.account_number ?? '',
    loanPurpose: loan.purpose,
    principalCentavos,
    interestRate: loan.interest_rate,
    termMonths: loan.term_months,
    monthlyInterestCentavos,
    totalRepaymentCentavos,
    mfkBankName: MFK_BANK_NAME,
    mfkAccountName: MFK_ACCOUNT_NAME,
    mfkAccountNumber: MFK_ACCOUNT_NUMBER,
    documentDate,
    loanId: loan.id,
  }
}

/**
 * Generates the MFK loan agreement PDF and returns it as a Buffer.
 * Uses renderToBuffer() — the server-safe method (not renderToStream).
 */
export async function generateContractPDF(data: ContractData): Promise<Buffer> {
  // ContractPDF renders a <Document> root — cast to satisfy renderToBuffer's type signature
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const element = createElement(ContractPDF, { data }) as ReactElement<any>
  const buffer = await renderToBuffer(element)
  return Buffer.from(buffer)
}
