import 'dotenv/config'
import { supabase } from './utils/supabase'

interface CheckResult {
  name: string
  passed: boolean
  actual?: string
  expected?: string
}

const results: CheckResult[] = []

function formatCurrency(centavos: number | null): string {
  if (centavos === null || centavos === undefined) return '₱0.00'
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
  }).format(centavos / 100)
}

function logResult(name: string, passed: boolean, actual?: string, expected?: string): void {
  if (passed) {
    console.log(`✓ ${name}`)
  } else {
    console.log(`✗ ${name} — actual: ${actual} (expected ${expected})`)
  }
  results.push({ name, passed, actual, expected })
}

async function runChecks(): Promise<void> {
  console.log('🔍 Running post-seed verification...\n')

  try {
    // Check 1: Partners count = 3
    const { data: partnersData, error: partnersError } = await supabase
      .from('partners')
      .select('id', { count: 'exact' })
    if (partnersError) throw partnersError
    const partnerCount = partnersData?.length || 0
    logResult('Partners count = 3', partnerCount === 3, `${partnerCount}`, '3')

    // Check 2: Frank total contributions = ₱119,000.00 (11900000 centavos)
    // Frank covered Sep/Oct '23 for all partners (₱6,000 each month) — intentional overpayment
    const { data: frankPartner, error: frankPartnerError } = await supabase
      .from('partners')
      .select('id')
      .eq('name', 'Frank')
      .single()
    if (frankPartnerError) throw frankPartnerError
    const { data: frankContributions, error: frankContribError } = await supabase
      .from('contributions')
      .select('amount')
      .eq('partner_id', frankPartner.id)
    if (frankContribError) throw frankContribError
    const frankTotal =
      frankContributions?.reduce((sum: number, row: { amount: number }) => sum + row.amount, 0) || 0
    const frankPassed = frankTotal === 11900000
    logResult(
      'Frank total contributions = ₱119,000.00',
      frankPassed,
      formatCurrency(frankTotal),
      formatCurrency(11900000)
    )

    // Check 3: Francis total contributions = ₱111,000.00 (11100000 centavos)
    const { data: francisPartner, error: francisPartnerError } = await supabase
      .from('partners')
      .select('id')
      .eq('name', 'Francis')
      .single()
    if (francisPartnerError) throw francisPartnerError
    const { data: francisContributions, error: francisContribError } = await supabase
      .from('contributions')
      .select('amount')
      .eq('partner_id', francisPartner.id)
    if (francisContribError) throw francisContribError
    const francisPassed =
      francisContributions?.reduce((sum: number, row: { amount: number }) => sum + row.amount, 0) ||
      0
    const francisTotal = francisPassed
    const francisPassed2 = francisTotal === 11100000
    logResult(
      'Francis total contributions = ₱111,000.00',
      francisPassed2,
      formatCurrency(francisTotal),
      formatCurrency(11100000)
    )

    // Check 4: Kim total contributions = ₱111,000.00 (11100000 centavos)
    const { data: kimPartner, error: kimPartnerError } = await supabase
      .from('partners')
      .select('id')
      .eq('name', 'Kim')
      .single()
    if (kimPartnerError) throw kimPartnerError
    const { data: kimContributions, error: kimContribError } = await supabase
      .from('contributions')
      .select('amount')
      .eq('partner_id', kimPartner.id)
    if (kimContribError) throw kimContribError
    const kimTotal =
      kimContributions?.reduce((sum: number, row: { amount: number }) => sum + row.amount, 0) || 0
    const kimPassed = kimTotal === 11100000
    logResult(
      'Kim total contributions = ₱111,000.00',
      kimPassed,
      formatCurrency(kimTotal),
      formatCurrency(11100000)
    )

    // Check 5: Grand total contributions = ₱341,000.00 (34100000 centavos)
    // Frank ₱119,000 + Francis ₱111,000 + Kim ₱111,000 = ₱341,000
    const { data: allContributions, error: allContribError } = await supabase
      .from('contributions')
      .select('amount')
    if (allContribError) throw allContribError
    const grandTotal =
      allContributions?.reduce((sum: number, row: { amount: number }) => sum + row.amount, 0) || 0
    const grandPassed = grandTotal === 34100000
    logResult(
      'Grand total contributions = ₱341,000.00',
      grandPassed,
      formatCurrency(grandTotal),
      formatCurrency(34100000)
    )

    // Check 6: Dividend records = 3
    const { data: dividendData, error: dividendError } = await supabase
      .from('dividends')
      .select('id', { count: 'exact' })
    if (dividendError) throw dividendError
    const dividendCount = dividendData?.length || 0
    logResult('Dividend records = 3', dividendCount === 3, `${dividendCount}`, '3')

    // Check 7: Total dividends distributed = ₱30,000.00 (3000000 centavos)
    const { data: allDividends, error: allDividendError } = await supabase
      .from('dividends')
      .select('amount')
    if (allDividendError) throw allDividendError
    const totalDividends =
      allDividends?.reduce((sum: number, row: { amount: number }) => sum + row.amount, 0) || 0
    const dividendsPassed = totalDividends === 3000000
    logResult(
      'Total dividends distributed = ₱30,000.00',
      dividendsPassed,
      formatCurrency(totalDividends),
      formatCurrency(3000000)
    )

    // Check 8: Melca Ybañez exists in borrowers table
    const { data: melcaData, error: melcaError } = await supabase
      .from('borrowers')
      .select('id', { count: 'exact' })
      .eq('email', 'melcasham25@gmail.com')
    if (melcaError) throw melcaError
    const melcaCount = melcaData?.length || 0
    logResult('Melca Ybañez exists in borrowers table', melcaCount >= 1, `${melcaCount}`, '>= 1')

    // Check 9: No contribution record has amount = 0
    const { data: zeroAmountData, error: zeroAmountError } = await supabase
      .from('contributions')
      .select('id', { count: 'exact' })
      .eq('amount', 0)
    if (zeroAmountError) throw zeroAmountError
    const zeroAmountCount = zeroAmountData?.length || 0
    logResult(
      'No contribution record has amount = 0',
      zeroAmountCount === 0,
      `${zeroAmountCount}`,
      '0'
    )

    // Check 10: No contribution record has a null partner_id
    const { data: nullPartnerIdData, error: nullPartnerIdError } = await supabase
      .from('contributions')
      .select('id', { count: 'exact' })
      .is('partner_id', null)
    if (nullPartnerIdError) throw nullPartnerIdError
    const nullPartnerIdCount = nullPartnerIdData?.length || 0
    logResult(
      'No contribution record has a null partner_id',
      nullPartnerIdCount === 0,
      `${nullPartnerIdCount}`,
      '0'
    )
  } catch (error) {
    console.error('Error running checks:', error)
    process.exit(1)
  }

  // Print summary
  console.log('')
  const passedCount = results.filter((r) => r.passed).length
  const totalCount = results.length

  console.log(`Results: ${passedCount}/${totalCount} checks passed`)

  if (passedCount === totalCount) {
    console.log('✅ All checks passed!')
  } else {
    console.log(`❌ ${totalCount - passedCount} check(s) failed. See above for details.`)
    process.exit(1)
  }
}

runChecks()
