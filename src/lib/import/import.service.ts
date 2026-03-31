/**
 * Import service layer — the bridge between parsed CSV data and Supabase.
 *
 * All three functions are idempotent: re-importing the same data skips duplicates
 * instead of creating them. They use the service-role client to bypass RLS.
 *
 * IMPORTANT: Only call these from Server Actions. Never import from components.
 */

import { generateSchedule } from '@/lib/finance'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import type { ParsedDiminishingData, ParsedDiminishingLoan } from './parsers/diminishing.parser'
import type { ParsedLendingData, ParsedLoan } from './parsers/lending.parser'
import type { ParsedStashData } from './parsers/stash.parser'

export interface ImportResult {
  imported: number
  skipped: number
  errors: Array<{ row: number; message: string }>
}

const PARTNER_NAMES = ['Frank', 'Francis', 'Kim'] as const

// ─── Stash Import ─────────────────────────────────────────────────────────────

export async function importStash(data: ParsedStashData, logId: string): Promise<ImportResult> {
  const supabase = createServiceRoleClient()
  let imported = 0
  let skipped = 0
  const errors: ImportResult['errors'] = []

  try {
    // Build partner name → UUID map
    const { data: partners, error: partnersErr } = await supabase
      .from('partners')
      .select('id, name')
    if (partnersErr) throw partnersErr

    const partnerMap = new Map(
      (partners ?? []).map((p: { id: string; name: string }) => [p.name.toLowerCase(), p.id])
    )

    const contribResult = await importContributions(supabase, data.contributions, partnerMap)
    imported += contribResult.imported
    skipped += contribResult.skipped
    errors.push(...contribResult.errors)

    const dividendResult = await importDividends(supabase, data.dividends, partnerMap)
    imported += dividendResult.imported
    skipped += dividendResult.skipped
    errors.push(...dividendResult.errors)
  } catch (err) {
    console.error('[importStash] Unhandled error:', err)
    errors.push({ row: 0, message: String(err) })
  } finally {
    await updateLog(supabase, logId, imported, skipped, errors)
  }

  return { imported, skipped, errors }
}

async function importContributions(
  supabase: ReturnType<typeof createServiceRoleClient>,
  contributions: ParsedStashData['contributions'],
  partnerMap: Map<string, string>
): Promise<ImportResult> {
  let imported = 0
  let skipped = 0
  const errors: ImportResult['errors'] = []

  for (const c of contributions) {
    const partnerId = partnerMap.get(c.partnerName.toLowerCase())
    if (!partnerId) {
      errors.push({ row: 0, message: `Unknown partner: ${c.partnerName}` })
      continue
    }

    // Upsert with ignoreDuplicates — UNIQUE(partner_id, month) constraint handles idempotency
    const { data: insertResult, error } = await supabase
      .from('contributions')
      .upsert(
        {
          partner_id: partnerId,
          amount: c.amount,
          month: c.month,
          paid_at: `${c.month}-01`,
          remarks: c.remarks,
        },
        { onConflict: 'partner_id,month', ignoreDuplicates: true }
      )
      .select('id')

    if (error) {
      errors.push({
        row: 0,
        message: `Contribution insert failed (${c.month} ${c.partnerName}): ${error.message}`,
      })
    } else if (insertResult && insertResult.length > 0) {
      imported++
    } else {
      skipped++
    }
  }

  return { imported, skipped, errors }
}

async function importDividends(
  supabase: ReturnType<typeof createServiceRoleClient>,
  dividends: ParsedStashData['dividends'],
  partnerMap: Map<string, string>
): Promise<ImportResult> {
  let imported = 0
  let skipped = 0
  const errors: ImportResult['errors'] = []

  for (const d of dividends) {
    for (const partnerName of PARTNER_NAMES) {
      const partnerId = partnerMap.get(partnerName.toLowerCase())
      if (!partnerId) continue

      // Per-(partner_id, distributed_at) idempotency check — prevents partial-import skips
      const { data: existingDividend } = await supabase
        .from('dividends')
        .select('id')
        .eq('partner_id', partnerId)
        .eq('distributed_at', `${d.month}-01`)
        .maybeSingle()

      if (existingDividend) {
        skipped++
        continue
      }

      const { error } = await supabase.from('dividends').insert({
        partner_id: partnerId,
        amount: d.amountPerPartner,
        distributed_at: `${d.month}-01`,
        remarks: null,
      })

      if (error) {
        errors.push({
          row: 0,
          message: `Dividend insert failed (${d.month} ${partnerName}): ${error.message}`,
        })
      } else {
        imported++
      }
    }
  }

  return { imported, skipped, errors }
}

// ─── Lending Import ───────────────────────────────────────────────────────────

export async function importLending(
  data: ParsedLendingData,
  logId: string,
  importSource: string
): Promise<ImportResult> {
  const supabase = createServiceRoleClient()
  let imported = 0
  let skipped = 0
  const errors: ImportResult['errors'] = []

  try {
    for (const parsedLoan of data.loans) {
      try {
        const result = await importSingleLoan(supabase, parsedLoan, importSource)
        imported += result.imported
        skipped += result.skipped
        errors.push(...result.errors)
      } catch (err) {
        console.error('[importLending] Loan import error:', err)
        errors.push({
          row: 0,
          message: `Failed to import loan for ${parsedLoan.borrowerName}: ${String(err)}`,
        })
      }
    }
  } finally {
    await updateLog(supabase, logId, imported, skipped, errors)
  }

  return { imported, skipped, errors }
}

async function importSingleLoan(
  supabase: ReturnType<typeof createServiceRoleClient>,
  parsedLoan: ParsedLoan,
  importSource: string
): Promise<ImportResult> {
  let imported = 0
  let skipped = 0
  const errors: ImportResult['errors'] = []

  // Upsert borrower by name
  const { data: borrower, error: borrowerErr } = await supabase
    .from('borrowers')
    .upsert(
      { full_name: parsedLoan.borrowerName },
      { onConflict: 'full_name', ignoreDuplicates: false }
    )
    .select('id')
    .single()

  if (borrowerErr || !borrower) {
    errors.push({
      row: 0,
      message: `Borrower upsert failed for ${parsedLoan.borrowerName}: ${borrowerErr?.message}`,
    })
    return { imported, skipped, errors }
  }

  const borrowerId: string = borrower.id

  // Idempotency: skip if loan for this borrower + startMonth already exists
  if (parsedLoan.startMonth) {
    const { data: existingLoan } = await supabase
      .from('loans')
      .select('id')
      .eq('borrower_id', borrowerId)
      .eq('start_date', `${parsedLoan.startMonth}-01`)
      .maybeSingle()

    if (existingLoan) {
      skipped++
      return { imported, skipped, errors }
    }
  }

  // Derive term_months from payment count (minimum 1)
  const termMonths = Math.max(parsedLoan.payments.length, 1)
  const startDate = parsedLoan.startMonth ? `${parsedLoan.startMonth}-01` : '2000-01-01'
  const endDate = parsedLoan.endMonth ? `${parsedLoan.endMonth}-01` : startDate

  // Insert loan
  const { data: loan, error: loanErr } = await supabase
    .from('loans')
    .insert({
      borrower_id: borrowerId,
      loan_type: parsedLoan.loanType,
      principal: parsedLoan.principal,
      interest_rate: 0.05,
      term_months: termMonths,
      start_date: startDate,
      end_date: endDate,
      status: parsedLoan.status,
      reminders_enabled: false,
      imported_at: new Date().toISOString(),
      import_source: importSource,
    })
    .select('id')
    .single()

  if (loanErr || !loan) {
    errors.push({
      row: 0,
      message: `Loan insert failed for ${parsedLoan.borrowerName}: ${loanErr?.message}`,
    })
    return { imported, skipped, errors }
  }

  const loanId: string = loan.id
  imported++

  const paymentsResult = await insertLoanPayments(supabase, loanId, parsedLoan.payments)
  imported += paymentsResult.imported
  errors.push(...paymentsResult.errors)

  const returnsResult = await insertPrincipalReturns(supabase, loanId, parsedLoan.principalReturns)
  imported += returnsResult.imported
  errors.push(...returnsResult.errors)

  const scheduleResult = await insertLoanSchedule(
    supabase,
    loanId,
    parsedLoan,
    termMonths,
    startDate
  )
  errors.push(...scheduleResult.errors)

  return { imported, skipped, errors }
}

async function insertLoanPayments(
  supabase: ReturnType<typeof createServiceRoleClient>,
  loanId: string,
  payments: ParsedLoan['payments']
): Promise<Pick<ImportResult, 'imported' | 'errors'>> {
  let imported = 0
  const errors: ImportResult['errors'] = []

  for (const payment of payments) {
    const { error } = await supabase.from('payments').insert({
      loan_id: loanId,
      amount_paid: payment.amount,
      paid_at: `${payment.month}-01`,
      payment_type: 'interest',
      late_days: 0,
      penalty_amount: 0,
      remarks: payment.remarks,
    })
    if (error) {
      errors.push({ row: 0, message: `Payment insert failed: ${error.message}` })
    } else {
      imported++
    }
  }

  return { imported, errors }
}

async function insertPrincipalReturns(
  supabase: ReturnType<typeof createServiceRoleClient>,
  loanId: string,
  principalReturns: ParsedLoan['principalReturns']
): Promise<Pick<ImportResult, 'imported' | 'errors'>> {
  let imported = 0
  const errors: ImportResult['errors'] = []

  for (const pr of principalReturns) {
    if (!pr.amount || pr.amount <= 0) continue
    const { error } = await supabase.from('principal_returns').insert({
      loan_id: loanId,
      amount: pr.amount,
      returned_at: pr.returnedAt,
      remarks: null,
    })
    if (error) {
      errors.push({ row: 0, message: `Principal return insert failed: ${error.message}` })
    } else {
      imported++
    }
  }

  return { imported, errors }
}

async function insertLoanSchedule(
  supabase: ReturnType<typeof createServiceRoleClient>,
  loanId: string,
  parsedLoan: ParsedLoan,
  termMonths: number,
  startDate: string
): Promise<Pick<ImportResult, 'errors'>> {
  const errors: ImportResult['errors'] = []

  if (parsedLoan.principal <= 0) return { errors }

  try {
    const scheduleEntries = generateSchedule({
      loanType: parsedLoan.loanType,
      principal: parsedLoan.principal,
      rate: 0.05,
      termMonths,
      startDate,
    })

    const scheduleRows = scheduleEntries.map((entry, idx) => ({
      loan_id: loanId,
      due_date: entry.dueDate,
      period_number: idx + 1,
      principal_due: entry.principalDue,
      interest_due: entry.interestDue,
      total_due: entry.totalDue,
      balance_after: entry.balanceAfter,
      status: 'pending',
    }))

    const { error: schedErr } = await supabase.from('loan_schedules').insert(scheduleRows)
    if (schedErr) {
      errors.push({ row: 0, message: `Schedule insert failed: ${schedErr.message}` })
    }
  } catch (schedGenErr) {
    errors.push({ row: 0, message: `Schedule generation failed: ${String(schedGenErr)}` })
  }

  return { errors }
}

// ─── Diminishing Import ───────────────────────────────────────────────────────

export async function importDiminishing(
  data: ParsedDiminishingData,
  logId: string,
  importSource: string
): Promise<ImportResult> {
  const supabase = createServiceRoleClient()
  let imported = 0
  let skipped = 0
  const errors: ImportResult['errors'] = []

  try {
    for (const parsedLoan of data.loans) {
      try {
        const result = await importSingleDiminishingLoan(supabase, parsedLoan, importSource)
        imported += result.imported
        skipped += result.skipped
        errors.push(...result.errors)
      } catch (err) {
        errors.push({
          row: 0,
          message: `Failed to import diminishing loan for ${parsedLoan.borrowerName}: ${String(err)}`,
        })
      }
    }
  } finally {
    await updateLog(supabase, logId, imported, skipped, errors)
  }

  return { imported, skipped, errors }
}

async function importSingleDiminishingLoan(
  supabase: ReturnType<typeof createServiceRoleClient>,
  parsedLoan: ParsedDiminishingLoan,
  importSource: string
): Promise<ImportResult> {
  let imported = 0
  let skipped = 0
  const errors: ImportResult['errors'] = []

  // Upsert borrower
  const { data: borrower, error: borrowerErr } = await supabase
    .from('borrowers')
    .upsert(
      { full_name: parsedLoan.borrowerName },
      { onConflict: 'full_name', ignoreDuplicates: false }
    )
    .select('id')
    .single()

  if (borrowerErr || !borrower) {
    errors.push({
      row: 0,
      message: `Borrower upsert failed for ${parsedLoan.borrowerName}: ${borrowerErr?.message}`,
    })
    return { imported, skipped, errors }
  }

  const borrowerId: string = borrower.id

  // Idempotency check
  const { data: existingLoan } = await supabase
    .from('loans')
    .select('id')
    .eq('borrower_id', borrowerId)
    .eq('start_date', parsedLoan.startDate)
    .maybeSingle()

  if (existingLoan) {
    skipped++
    return { imported, skipped, errors }
  }

  // Insert loan
  const endDate = parsedLoan.payments.at(-1)?.dueDate ?? parsedLoan.startDate
  const { data: loan, error: loanErr } = await supabase
    .from('loans')
    .insert({
      borrower_id: borrowerId,
      loan_type: 'diminishing',
      principal: parsedLoan.principal,
      interest_rate: 0.05,
      term_months: parsedLoan.termMonths,
      start_date: parsedLoan.startDate,
      end_date: endDate,
      status: 'active',
      reminders_enabled: false,
      imported_at: new Date().toISOString(),
      import_source: importSource,
    })
    .select('id')
    .single()

  if (loanErr || !loan) {
    errors.push({
      row: 0,
      message: `Loan insert failed for ${parsedLoan.borrowerName}: ${loanErr?.message}`,
    })
    return { imported, skipped, errors }
  }

  const loanId: string = loan.id
  imported++

  // Insert schedule entries from the parsed data
  const scheduleRows = parsedLoan.payments.map((p) => ({
    loan_id: loanId,
    due_date: p.dueDate,
    period_number: p.period,
    principal_due: p.principalDue,
    interest_due: p.interestDue,
    total_due: p.totalDue,
    balance_after: p.balanceAfter,
    status: 'pending',
  }))

  const { error: schedErr } = await supabase.from('loan_schedules').insert(scheduleRows)
  if (schedErr) {
    errors.push({ row: 0, message: `Schedule insert failed: ${schedErr.message}` })
  } else {
    imported += scheduleRows.length
  }

  return { imported, skipped, errors }
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

async function updateLog(
  supabase: ReturnType<typeof createServiceRoleClient>,
  logId: string,
  imported: number,
  skipped: number,
  errors: ImportResult['errors']
) {
  const hasErrors = errors.length > 0
  await supabase
    .from('import_logs')
    .update({
      rows_imported: imported,
      rows_skipped: skipped,
      errors: hasErrors ? errors : null,
      status: hasErrors ? 'failed' : 'completed',
      completed_at: new Date().toISOString(),
    })
    .eq('id', logId)
}
