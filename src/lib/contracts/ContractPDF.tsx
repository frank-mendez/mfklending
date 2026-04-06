/**
 * MFK Lending Corporation loan agreement PDF template.
 * SERVER-SIDE ONLY — uses @react-pdf/renderer which must not run in the browser.
 * Matches the Melca Ybañez agreement layout.
 */
import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import type { ContractData } from '@/types'

// ─── Formatting helpers (no Intl in react-pdf environment) ────────────────────

function formatPHP(centavos: number): string {
  const pesos = centavos / 100
  return `₱${pesos.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    paddingTop: 40,
    paddingBottom: 40,
    paddingLeft: 40,
    paddingRight: 40,
    backgroundColor: '#ffffff',
    lineHeight: 1.4,
  },
  // Header
  header: {
    alignItems: 'center',
    marginBottom: 8,
  },
  headerBrand: {
    fontSize: 28,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 4,
    color: '#1a1a2e',
  },
  headerSub: {
    fontSize: 9,
    letterSpacing: 3,
    color: '#444',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  divider: {
    borderBottomWidth: 1.5,
    borderBottomColor: '#1a1a2e',
    marginVertical: 8,
  },
  thinDivider: {
    borderBottomWidth: 0.5,
    borderBottomColor: '#cccccc',
    marginVertical: 6,
  },
  // Title
  title: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#1a1a2e',
  },
  // Body
  intro: {
    fontSize: 9,
    textAlign: 'justify',
    marginBottom: 10,
    color: '#333',
  },
  // Sections
  sectionHeading: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 5,
    marginTop: 8,
    color: '#1a1a2e',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  label: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    width: 110,
    color: '#333',
  },
  value: {
    fontSize: 9,
    flex: 1,
    color: '#111',
  },
  paragraph: {
    fontSize: 9,
    marginBottom: 4,
    textAlign: 'justify',
    color: '#333',
    lineHeight: 1.5,
  },
  // Highlighted rows (yellow background)
  highlighted: {
    backgroundColor: '#fffde7',
    padding: 4,
    marginBottom: 4,
    borderRadius: 2,
  },
  highlightedBold: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'justify',
    lineHeight: 1.5,
  },
  // Boxed section (MFK bank account)
  box: {
    borderWidth: 1,
    borderColor: '#1a1a2e',
    padding: 8,
    marginVertical: 6,
    alignItems: 'center',
  },
  boxText: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    marginBottom: 2,
    color: '#1a1a2e',
  },
  // Italic helper
  italic: {
    fontSize: 8,
    fontFamily: 'Helvetica-Oblique',
    color: '#555',
    marginTop: 3,
  },
  // Signature block
  signatureSection: {
    marginTop: 20,
    paddingTop: 12,
    borderTopWidth: 0.5,
    borderTopColor: '#cccccc',
  },
  signatureText: {
    fontSize: 9,
    textAlign: 'justify',
    marginBottom: 16,
    color: '#333',
  },
  signatureLine: {
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    width: 220,
    marginBottom: 3,
  },
  signatureLabel: {
    fontSize: 8,
    color: '#666',
    marginBottom: 12,
  },
  docId: {
    fontSize: 7,
    color: '#aaa',
    marginTop: 10,
    textAlign: 'center',
  },
})

// ─── Component ────────────────────────────────────────────────────────────────

interface ContractPDFProps {
  data: ContractData
}

export function ContractPDF({ data }: ContractPDFProps) {
  const principalFormatted = formatPHP(data.principalCentavos)
  const monthlyInterestFormatted = formatPHP(data.monthlyInterestCentavos)
  const totalInterestFormatted = formatPHP(data.monthlyInterestCentavos * data.termMonths)
  const totalRepaymentFormatted = formatPHP(data.totalRepaymentCentavos)

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerBrand}>MFK</Text>
          <Text style={styles.headerSub}>Lending Corp</Text>
        </View>
        <View style={styles.divider} />

        {/* Title */}
        <Text style={styles.title}>
          MFK Lending Corporation - Lending Agreement and Borrower Criteria
        </Text>

        {/* Intro */}
        <Text style={styles.intro}>
          This Lending Agreement ("Agreement") outlines the criteria and terms for borrowing from
          MFK Lending Corporation ("Lender"). Please read this Agreement carefully. By applying for
          and accepting a loan from MFK Lending Corporation, you acknowledge and agree to the
          following terms and conditions:
        </Text>

        {/* Section 1 — Personal Information */}
        <Text style={styles.sectionHeading}>1. Personal Information:</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Full Name:</Text>
          <Text style={styles.value}>{data.borrowerFullName}</Text>
          <Text style={styles.label}>Age:</Text>
          <Text style={styles.value}>{data.borrowerAge}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Occupation:</Text>
          <Text style={styles.value}>{data.borrowerOccupation}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Contact Number:</Text>
          <Text style={styles.value}>{data.borrowerPhone}</Text>
          <Text style={styles.label}>Email:</Text>
          <Text style={styles.value}>{data.borrowerEmail}</Text>
        </View>
        <View style={styles.thinDivider} />

        {/* Section 2 — Loan Application Requirements */}
        <Text style={styles.sectionHeading}>2. Loan Application Requirements:</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Loan Purpose:</Text>
          <Text style={styles.value}>{data.loanPurpose ?? '_______________'}</Text>
        </View>
        <View style={[styles.row, styles.highlighted]}>
          <Text style={styles.label}>Initial Loan Amount:</Text>
          <Text style={[styles.value, { fontFamily: 'Helvetica-Bold' }]}>{principalFormatted}</Text>
        </View>

        <Text style={[styles.paragraph, { fontFamily: 'Helvetica-Bold', marginTop: 4 }]}>
          Online Bank Account Information
        </Text>
        <View style={styles.row}>
          <Text style={styles.label}>Bank:</Text>
          <Text style={styles.value}>{data.borrowerBank}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Account Name:</Text>
          <Text style={styles.value}>{data.borrowerAccountName}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Account Number:</Text>
          <Text style={styles.value}>{data.borrowerAccountNumber}</Text>
        </View>
        <Text style={styles.italic}>
          Borrower must possess a valid online bank account for loan disbursement and repayment.
        </Text>
        <View style={styles.thinDivider} />

        {/* Section 3 — Loan Terms and Conditions */}
        <Text style={styles.sectionHeading}>3. Loan Terms and Conditions:</Text>
        <View style={styles.highlighted}>
          <Text style={styles.highlightedBold}>
            Monthly Interest: The interest on the outstanding loan balance is calculated at a rate
            of 5% per month, on the outstanding loan balance for a three-month loan term.
          </Text>
        </View>

        {/* MFK collection account box */}
        <View style={styles.box}>
          <Text style={styles.boxText}>Bank: {data.mfkBankName}</Text>
          <Text style={styles.boxText}>Account Name: {data.mfkAccountName}</Text>
          <Text style={styles.boxText}>Account Number: {data.mfkAccountNumber}</Text>
        </View>

        <View style={styles.highlighted}>
          <Text style={styles.highlightedBold}>
            Loan Term: The loan term is for {data.termMonths} month(s). Borrower agrees to repay the
            total loan amount (principal) at the end of the {data.termMonths}-month term.
          </Text>
        </View>

        <View style={[styles.highlighted, { marginTop: 4 }]}>
          <Text style={styles.highlightedBold}>
            At the end of the loan term, MFK receives a total sum of {totalRepaymentFormatted} —
            which is {principalFormatted} (principal) and {totalInterestFormatted} (interest @{' '}
            {monthlyInterestFormatted} per month).
          </Text>
        </View>
        <View style={styles.thinDivider} />

        {/* Section 4 — Loan Amount Increase */}
        <Text style={styles.sectionHeading}>4. Loan Amount Increase:</Text>
        <Text style={styles.paragraph}>
          MFK Lending Corporation reserves the right to increase or decrease the loan amount based
          on the borrower's repayment history and creditworthiness. Any changes to the loan amount
          will be communicated in advance and require a new written agreement.
        </Text>
        <View style={styles.thinDivider} />

        {/* Section 5 — Repayment, Penalties and Communication */}
        <Text style={styles.sectionHeading}>5. Repayment, Penalties and Communication:</Text>
        <View style={styles.highlighted}>
          <Text style={styles.highlightedBold}>
            Late Payment Penalty: A late payment penalty of 1% per day of the accrued interest for
            each day of delayed payment will be charged. For example, if the monthly interest is{' '}
            {monthlyInterestFormatted} and payment is 5 days late, the penalty is{' '}
            {formatPHP(Math.round(data.monthlyInterestCentavos * 0.01 * 5))}.
          </Text>
        </View>
        <Text style={styles.paragraph}>
          Total Amount Due: In the event of late payment, the borrower shall pay the outstanding
          principal, all accrued interest, and any applicable late payment penalties. The total
          amount due will be calculated as of the date of actual payment.
        </Text>
        <Text style={styles.paragraph}>
          Communication: The borrower agrees to maintain open communication with MFK Lending
          Corporation regarding any difficulties in meeting payment obligations. All payment
          notifications will be sent to the registered email and contact number.
        </Text>
        <View style={styles.thinDivider} />

        {/* Section 6 — Miscellaneous */}
        <Text style={styles.sectionHeading}>6. Miscellaneous:</Text>
        <Text style={styles.paragraph}>
          Data Privacy: MFK Lending Corporation will handle all personal information in accordance
          with the Data Privacy Act of 2012 (Republic Act 10173). Borrower information will only be
          used for loan processing and communication purposes.
        </Text>
        <Text style={styles.paragraph}>
          Agreement Changes: MFK Lending Corporation reserves the right to modify this Agreement.
          Borrowers will be notified of any changes at least 30 days in advance.
        </Text>
        <Text style={styles.paragraph}>
          Dispute Resolution: Any disputes arising from this Agreement shall be resolved through
          mutual discussion between the parties. If unresolved, disputes may be escalated to the
          appropriate legal authorities in the Philippines.
        </Text>

        {/* Signature Block */}
        <View style={styles.signatureSection}>
          <Text style={styles.signatureText}>
            By accepting this Agreement, the Borrower acknowledges and agrees to all the terms and
            conditions specified above.
          </Text>
          <View style={styles.signatureLine} />
          <Text style={styles.signatureLabel}>Borrower Signature</Text>
          <View style={styles.row}>
            <Text style={[styles.label, { fontSize: 9 }]}>Date:</Text>
            <Text style={styles.value}>{data.documentDate}</Text>
          </View>
        </View>

        <Text style={styles.docId}>Document ID: {data.loanId}</Text>
      </Page>
    </Document>
  )
}
