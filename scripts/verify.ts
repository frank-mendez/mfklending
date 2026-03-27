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

/** Fetch SUM(amount) for a given table + optional filter. */
async function sumAmount(
  table: string,
  filter?: { column: string; value: string }
): Promise<number> {
  let query = supabase.from(table).select('amount')
  if (filter) query = query.eq(filter.column, filter.value)
  const { data, error } = await query
  if (error) throw error
  return data?.reduce((sum: number, row: { amount: number }) => sum + row.amount, 0) ?? 0
}

async function runChecks(): Promise<void> {
  console.log('🔍 Running post-seed verification...\n')

  try {
    // Check 1: Partners count = 3
    const { count: partnerCount, error: partnersError } = await supabase
      .from('partners')
      .select('*', { count: 'exact', head: true })
    if (partnersError) throw partnersError
    logResult('Partners count = 3', (partnerCount ?? 0) === 3, `${partnerCount ?? 0}`, '3')

    // Fetch partner IDs once for per-partner sum checks
    const { data: partners, error: partnerFetchError } = await supabase
      .from('partners')
      .select('id, name')
    if (partnerFetchError) throw partnerFetchError

    const partnerId = (name: string) => partners?.find((p) => p.name === name)?.id ?? ''

    // Check 2: Frank total contributions = ₱119,000.00
    // Frank covered Sep/Oct '23 for all partners (₱6,000 each month) — intentional overpayment
    const frankTotal = await sumAmount('contributions', {
      column: 'partner_id',
      value: partnerId('Frank'),
    })
    logResult(
      'Frank total contributions = ₱119,000.00',
      frankTotal === 11900000,
      formatCurrency(frankTotal),
      formatCurrency(11900000)
    )

    // Check 3: Francis total contributions = ₱111,000.00
    const francisTotal = await sumAmount('contributions', {
      column: 'partner_id',
      value: partnerId('Francis'),
    })
    logResult(
      'Francis total contributions = ₱111,000.00',
      francisTotal === 11100000,
      formatCurrency(francisTotal),
      formatCurrency(11100000)
    )

    // Check 4: Kim total contributions = ₱111,000.00
    const kimTotal = await sumAmount('contributions', {
      column: 'partner_id',
      value: partnerId('Kim'),
    })
    logResult(
      'Kim total contributions = ₱111,000.00',
      kimTotal === 11100000,
      formatCurrency(kimTotal),
      formatCurrency(11100000)
    )

    // Check 5: Grand total contributions = ₱341,000.00
    // Frank ₱119,000 + Francis ₱111,000 + Kim ₱111,000 = ₱341,000
    const grandTotal = await sumAmount('contributions')
    logResult(
      'Grand total contributions = ₱341,000.00',
      grandTotal === 34100000,
      formatCurrency(grandTotal),
      formatCurrency(34100000)
    )

    // Check 6: Dividend records = 3
    const { count: dividendCount, error: dividendCountError } = await supabase
      .from('dividends')
      .select('*', { count: 'exact', head: true })
    if (dividendCountError) throw dividendCountError
    logResult('Dividend records = 3', (dividendCount ?? 0) === 3, `${dividendCount ?? 0}`, '3')

    // Check 7: Total dividends distributed = ₱30,000.00 (3000000 centavos)
    const totalDividends = await sumAmount('dividends')
    logResult(
      'Total dividends distributed = ₱30,000.00',
      totalDividends === 3000000,
      formatCurrency(totalDividends),
      formatCurrency(3000000)
    )

    // Check 8: Melca Ybañez exists in borrowers table
    const { count: melcaCount, error: melcaError } = await supabase
      .from('borrowers')
      .select('*', { count: 'exact', head: true })
      .eq('email', 'melcasham25@gmail.com')
    if (melcaError) throw melcaError
    logResult(
      'Melca Ybañez exists in borrowers table',
      (melcaCount ?? 0) >= 1,
      `${melcaCount ?? 0}`,
      '>= 1'
    )

    // Check 9: No contribution record has amount = 0
    const { count: zeroAmountCount, error: zeroAmountError } = await supabase
      .from('contributions')
      .select('*', { count: 'exact', head: true })
      .eq('amount', 0)
    if (zeroAmountError) throw zeroAmountError
    logResult(
      'No contribution record has amount = 0',
      (zeroAmountCount ?? 0) === 0,
      `${zeroAmountCount ?? 0}`,
      '0'
    )

    // Check 10: No contribution record has a null partner_id
    const { count: nullPartnerIdCount, error: nullPartnerIdError } = await supabase
      .from('contributions')
      .select('*', { count: 'exact', head: true })
      .is('partner_id', null)
    if (nullPartnerIdError) throw nullPartnerIdError
    logResult(
      'No contribution record has a null partner_id',
      (nullPartnerIdCount ?? 0) === 0,
      `${nullPartnerIdCount ?? 0}`,
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
