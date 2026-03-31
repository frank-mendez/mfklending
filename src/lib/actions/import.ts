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
  // Serialised full data — stored as JSON in the import_log pending row
  serialisedData: string
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
        serialisedData: JSON.stringify(parsed),
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
        serialisedData: JSON.stringify(parsed),
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
        serialisedData: JSON.stringify(parsed),
      }
    } else {
      return actionError(`Import type "${importType}" is not yet supported.`)
    }
  } catch (err) {
    return actionError(`Parse failed: ${String(err)}`)
  }

  // Store serialised data in a pending import_log row — the row ID is the preview token
  const supabase = await createClient()
  const { data: log, error: logErr } = await supabase
    .from('import_logs')
    .insert({
      import_type: importType,
      status: 'pending',
      filename: file.name,
      rows_parsed: result.totalRows,
      errors: result.errors.length > 0 ? result.errors : null,
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
    serialisedData: result.serialisedData,
  })
}

// ─── confirmImport ────────────────────────────────────────────────────────────

export async function confirmImport(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const previewToken = formData.get('previewToken') as string | null
  const importType = formData.get('importType') as ImportType | null
  const serialisedData = formData.get('serialisedData') as string | null
  const filename = formData.get('filename') as string | null

  if (!previewToken) return actionError('Missing preview token.')
  if (!importType) return actionError('Missing import type.')
  if (!serialisedData) return actionError('Missing parsed data.')

  let importResult: Awaited<ReturnType<typeof importStash>>

  try {
    if (importType === 'stash') {
      const data = JSON.parse(serialisedData)
      importResult = await importStash(data, previewToken)
    } else if (importType === 'lending') {
      const data = JSON.parse(serialisedData)
      importResult = await importLending(data, previewToken, filename ?? 'unknown')
    } else if (importType === 'diminishing') {
      const data = JSON.parse(serialisedData)
      importResult = await importDiminishing(data, previewToken, filename ?? 'unknown')
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
