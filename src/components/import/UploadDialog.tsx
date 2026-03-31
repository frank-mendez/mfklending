'use client'

import { Upload } from 'lucide-react'
import { useActionState, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { confirmImport, uploadAndParseCSV } from '@/lib/actions/import'
import { formatPHP } from '@/lib/utils/currency'
import type { ImportType } from '@/types'

type Step = 'upload' | 'preview' | 'result'

interface UploadDialogProps {
  importType: ImportType
}

export function UploadDialog({ importType }: UploadDialogProps) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<Step>('upload')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const [parseState, parseAction, parsePending] = useActionState(uploadAndParseCSV, {
    success: false,
    message: '',
  })

  const [confirmState, confirmAction, confirmPending] = useActionState(confirmImport, {
    success: false,
    message: '',
  })

  const parseData = parseState.success ? (parseState.data as Record<string, unknown>) : null
  const confirmData = confirmState.success ? (confirmState.data as Record<string, unknown>) : null

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)
    if (!nextOpen) {
      // Reset on close
      setStep('upload')
      setSelectedFile(null)
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    setSelectedFile(file)
  }

  function handleParseSuccess() {
    setStep('preview')
  }

  function handleConfirmSuccess() {
    setStep('result')
  }

  const importTypeLabel: Record<ImportType, string> = {
    stash: 'Stash',
    lending: 'Lending',
    diminishing: 'Diminishing',
    summary: 'Summary',
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Upload className="mr-1.5 h-3.5 w-3.5" />
          Import
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl">
        {/* Step 1 — Upload */}
        {step === 'upload' && (
          <>
            <DialogHeader>
              <DialogTitle>Import {importTypeLabel[importType]}</DialogTitle>
              <DialogDescription>
                Upload a .csv export from the {importTypeLabel[importType]} tab in Google Sheets.
              </DialogDescription>
            </DialogHeader>

            <form
              action={parseAction}
              onSubmit={() => {
                // Transition to preview after parse succeeds
                // handled by useEffect-like pattern below
              }}
            >
              <input type="hidden" name="importType" value={importType} />

              <div className="flex flex-col gap-4 py-4">
                <button
                  type="button"
                  className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-muted-foreground/25 p-10 transition-colors hover:border-muted-foreground/50 w-full"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  {selectedFile ? (
                    <div className="text-center">
                      <p className="font-medium text-sm">{selectedFile.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(selectedFile.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <p className="text-sm font-medium">Click to choose a file</p>
                      <p className="text-xs text-muted-foreground">CSV only, max 5 MB</p>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    name="file"
                    accept=".csv"
                    className="sr-only"
                    onChange={handleFileChange}
                  />
                </button>

                {!parseState.success && parseState.message && (
                  <p className="text-sm text-destructive">{parseState.message}</p>
                )}
              </div>

              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={!selectedFile || parsePending}
                  onClick={() => {
                    // After action resolves, advance step if success
                    if (parseState.success) handleParseSuccess()
                  }}
                >
                  {parsePending ? 'Parsing…' : 'Parse File'}
                </Button>
              </DialogFooter>
            </form>

            {/* Auto-advance to preview when parse succeeds */}
            {parseState.success && step === 'upload' && (
              <span
                className="hidden"
                ref={(el) => {
                  if (el) handleParseSuccess()
                }}
              />
            )}
          </>
        )}

        {/* Step 2 — Preview */}
        {step === 'preview' && parseData && (
          <>
            <DialogHeader>
              <DialogTitle>Review Import</DialogTitle>
              <DialogDescription>
                {parseData.totalRows as number} rows detected
                {(parseData.errors as unknown[]).length > 0
                  ? ` — ${(parseData.errors as unknown[]).length} rows had errors and will be skipped`
                  : ''}
              </DialogDescription>
            </DialogHeader>

            <div className="max-h-72 overflow-auto rounded-md border">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-muted">
                  <tr>
                    {Object.keys((parseData.previewRows as Record<string, unknown>[])[0] ?? {}).map(
                      (col) => (
                        <th key={col} className="px-3 py-2 text-left font-medium capitalize">
                          {col}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(parseData.previewRows as Record<string, unknown>[]).map((row, i) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: stable preview rows
                    <tr key={i} className="hover:bg-muted/50">
                      {Object.values(row).map((val, j) => (
                        // biome-ignore lint/suspicious/noArrayIndexKey: stable columns
                        <td key={j} className="px-3 py-1.5">
                          {typeof val === 'number' && String(Object.keys(row)[j]).includes('amount')
                            ? formatPHP(val)
                            : String(val ?? '')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {(parseData.errors as unknown[]).length > 0 && (
              <div className="max-h-32 overflow-auto rounded-md border border-destructive/30 bg-destructive/5 p-3">
                <p className="mb-1 text-xs font-medium text-destructive">Parse errors (skipped):</p>
                {(parseData.errors as Array<{ row: number; message: string }>).map((e, i) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: stable error list
                  <p key={i} className="text-xs text-destructive">
                    Row {e.row}: {e.message}
                  </p>
                ))}
              </div>
            )}

            {!confirmState.success && confirmState.message && (
              <p className="text-sm text-destructive">{confirmState.message}</p>
            )}

            <form
              action={confirmAction}
              onSubmit={() => {
                if (confirmState.success) handleConfirmSuccess()
              }}
            >
              <input type="hidden" name="previewToken" value={parseData.previewToken as string} />
              <input type="hidden" name="importType" value={importType} />
              <input
                type="hidden"
                name="serialisedData"
                value={parseData.serialisedData as string}
              />
              <input type="hidden" name="filename" value={parseData.filename as string} />

              <DialogFooter className="mt-4">
                <Button type="button" variant="ghost" onClick={() => setStep('upload')}>
                  Back
                </Button>
                <Button type="submit" disabled={confirmPending}>
                  {confirmPending ? 'Importing…' : 'Confirm Import'}
                </Button>
              </DialogFooter>
            </form>

            {confirmState.success && step === 'preview' && (
              <span
                className="hidden"
                ref={(el) => {
                  if (el) handleConfirmSuccess()
                }}
              />
            )}
          </>
        )}

        {/* Step 3 — Result */}
        {step === 'result' && confirmData && (
          <>
            <DialogHeader>
              <DialogTitle>Import Complete</DialogTitle>
            </DialogHeader>

            <div className="py-4">
              <p className="text-sm font-medium text-green-700">
                ✓ Imported {confirmData.imported as number} rows. Skipped{' '}
                {confirmData.skipped as number} duplicates.
              </p>
              {(confirmData.errors as unknown[]).length > 0 && (
                <p className="mt-1 text-sm text-destructive">
                  {(confirmData.errors as unknown[]).length} rows failed — see import log for
                  details.
                </p>
              )}
              <p className="mt-3 text-xs text-muted-foreground">
                Log ID: {confirmData.logId as string}
              </p>
            </div>

            <DialogFooter>
              <Button onClick={() => setOpen(false)}>Close</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
