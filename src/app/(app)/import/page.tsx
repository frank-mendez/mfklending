import { BarChart2, BookOpen, FileText, PiggyBank, ShieldCheck } from 'lucide-react'
import Link from 'next/link'
import { UploadDialog } from '@/components/import/UploadDialog'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/server'
import { formatManila } from '@/lib/utils/date'
import type { ImportType } from '@/types'

interface ImportCard {
  type: ImportType
  title: string
  description: string
  targets: string
  icon: React.ComponentType<{ className?: string }>
}

const IMPORT_CARDS: ImportCard[] = [
  {
    type: 'stash',
    title: 'Stash',
    description: 'Monthly partner contributions and dividend distributions.',
    targets: 'contributions, dividends',
    icon: PiggyBank,
  },
  {
    type: 'lending',
    title: 'Lending',
    description: 'Flat-interest and hybrid diminishing loans with payment history.',
    targets: 'borrowers, loans, payments, principal_returns',
    icon: BookOpen,
  },
  {
    type: 'diminishing',
    title: 'Diminishing',
    description: 'Standard amortizing loans (AHA, VZ) with fixed schedules.',
    targets: 'borrowers, loans, loan_schedules',
    icon: BarChart2,
  },
  {
    type: 'summary',
    title: 'Summary',
    description: 'Bank transaction log and overall fund summary.',
    targets: 'bank_transactions',
    icon: FileText,
  },
]

export default async function ImportPage() {
  const supabase = await createClient()

  // Fetch last import per type
  const { data: logs } = await supabase
    .from('import_logs')
    .select('import_type, created_at, status')
    .eq('status', 'completed')
    .order('created_at', { ascending: false })

  const lastImport = new Map<ImportType, string>()
  for (const log of logs ?? []) {
    if (!lastImport.has(log.import_type as ImportType)) {
      lastImport.set(log.import_type as ImportType, log.created_at)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Import Data"
        subtitle="Google Sheets → MFK System"
        action={
          <Button asChild variant="default">
            <Link href="/import/verify">
              <ShieldCheck className="mr-2 h-4 w-4" />
              Verify Data
            </Link>
          </Button>
        }
      />

      <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
        The Google Sheet is the source of truth during transition. Import data here, verify it, then
        enable reminders per loan.
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {IMPORT_CARDS.map((card) => {
          const lastAt = lastImport.get(card.type)
          const Icon = card.icon
          return (
            <Card key={card.type}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="rounded-md bg-muted p-2">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <CardTitle className="text-base">{card.title}</CardTitle>
                  </div>
                  {card.type !== 'summary' && <UploadDialog importType={card.type} />}
                </div>
                <CardDescription>{card.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium">Tables:</span> {card.targets}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {lastAt
                    ? `Last imported ${formatManila(new Date(lastAt), 'MMM d, yyyy HH:mm')}`
                    : 'Never imported'}
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="flex justify-end">
        <Button asChild variant="ghost" size="sm">
          <Link href="/import/history">View Import History</Link>
        </Button>
      </div>
    </div>
  )
}
