'use server'

import { revalidatePath } from 'next/cache'
import { type ActionState, actionError, actionSuccess } from '@/lib/actions'
import { importDiminishing, importLending, importStash } from '@/lib/import/import.service'
import { parseDiminishingCSV } from '@/lib/import/parsers/diminishing.parser'
import { parseLendingCSV } from '@/lib/import/parsers/lending.parser'
import { parseStashCSV } from '@/lib/import/parsers/stash.parser'
import { createClient } from '@/lib/supabase/server'
import type { ImportType } from '@/types'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB

interface ParsePreviewRow {
  [key: string]: string | number | null
}

interface ParseResult {
  previewRows: ParsePreviewRow[]
  totalRows: number
  errors: Array<{ row: number; message: string }>
  importType: ImportType
  parsedData: unknown // Full parsed payload — stored server-side only
}

// ─── uploadAndParseCSV ────────────────────────────────────────────────────────

export async function uploadAndParseCSV(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const file = formData.get('file') as File | null
  const importType = formData.get('importType') as ImportType | null

  if (!file || file.size === 0) return actionError('No file selected.')
  if (!importType) return actionError('Import type is required.')
  if (!file.name.endsWith('.csv')) return actionError('File must be a .csv file.')
  if (file.size > MAX_FILE_SIZE) return actionError('File exceeds the 5 MB limit.')

  let csvText: string
  try {
    csvText = await file.text()
  } catch {
    return actionError('Could not read the file. Please try again.')
  }

  let result: ParseResult

  try {
    if (importType === 'stash') {
      const parsed = parseStashCSV(csvText)
      const previewRows: ParsePreviewRow[] = parsed.contributions.slice(0, 50).map((c) => ({
        month: c.month,
        partner: c.partnerName,
        amount: c.amount,
        remarks: c.remarks,
      }))
      result = {
        previewRows,
        totalRows: parsed.contributions.length + parsed.dividends.length,
        errors: parsed.errors,
        importType,
        parsedData: parsed,
      }
    } else if (importType === 'lending') {
      const parsed = parseLendingCSV(csvText)
      const previewRows: ParsePreviewRow[] = parsed.loans.slice(0, 50).map((l) => ({
        borrower: l.borrowerName,
        loanType: l.loanType,
        principal: l.principal,
        status: l.status,
        payments: l.payments.length,
        returns: l.principalReturns.length,
      }))
      result = {
        previewRows,
        totalRows: parsed.loans.length,
        errors: parsed.errors,
        importType,
        parsedData: parsed,
      }
    } else if (importType === 'diminishing') {
      const parsed = parseDiminishingCSV(csvText)
      const previewRows: ParsePreviewRow[] = parsed.loans.slice(0, 50).map((l) => ({
        borrower: l.borrowerName,
        principal: l.principal,
        termMonths: l.termMonths,
        startDate: l.startDate,
        periods: l.payments.length,
      }))
      result = {
        previewRows,
        totalRows: parsed.loans.length,
        errors: parsed.errors,
        importType,
        parsedData: parsed,
      }
    } else {
      return actionError(`Import type "${importType}" is not yet supported.`)
    }
  } catch (err) {
    return actionError(`Parse failed: ${String(err)}`)
  }

  // Store parsed data server-side — keyed by log ID (the preview token).
  // The client never receives the raw parsed payload, preventing tampering.
  const supabase = await createClient()
  const { data: log, error: logErr } = await supabase
    .from('import_logs')
    .insert({
      import_type: importType,
      status: 'pending',
      filename: file.name,
      rows_parsed: result.totalRows,
      errors: result.errors.length > 0 ? result.errors : null,
      parsed_data: result.parsedData,
    })
    .select('id')
    .single()

  if (logErr || !log) {
    return actionError('Could not create import log. Please try again.')
  }

  return actionSuccess('File parsed successfully.', {
    previewRows: result.previewRows,
    totalRows: result.totalRows,
    errors: result.errors,
    importType,
    previewToken: log.id,
    filename: file.name,
    // serialisedData intentionally NOT returned to the client
  })
}

// ─── confirmImport ────────────────────────────────────────────────────────────

export async function confirmImport(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const previewToken = formData.get('previewToken') as string | null

  if (!previewToken) return actionError('Missing preview token.')

  // Fetch the import type, filename, and parsed data from DB — never trust client-sent data
  const supabase = await createClient()
  const { data: logRow, error: logFetchErr } = await supabase
    .from('import_logs')
    .select('import_type, filename, parsed_data')
    .eq('id', previewToken)
    .eq('status', 'pending')
    .single()

  if (logFetchErr || !logRow?.parsed_data) {
    return actionError('Import session not found or already completed.')
  }

  const importType = logRow.import_type as ImportType
  const filename = logRow.filename as string
  const parsedData = logRow.parsed_data

  let importResult: Awaited<ReturnType<typeof importStash>>

  try {
    if (importType === 'stash') {
      importResult = await importStash(parsedData, previewToken)
    } else if (importType === 'lending') {
      importResult = await importLending(parsedData, previewToken, filename)
    } else if (importType === 'diminishing') {
      importResult = await importDiminishing(parsedData, previewToken, filename)
    } else {
      return actionError(`Import type "${importType}" is not supported.`)
    }
  } catch (err) {
    return actionError(`Import failed: ${String(err)}`)
  }

  revalidatePath('/import')
  revalidatePath('/import/verify')

  return actionSuccess(
    `Imported ${importResult.imported} rows. Skipped ${importResult.skipped} duplicates.`,
    {
      imported: importResult.imported,
      skipped: importResult.skipped,
      errors: importResult.errors,
      logId: previewToken,
    }
  )
}
