import { ArrowLeft, Briefcase, Building2, CreditCard, Mail, Phone, User } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CurrencyDisplay } from '@/components/shared/CurrencyDisplay'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { getBorrowerById } from '@/lib/data/borrowers'
import { formatManila } from '@/lib/utils/date'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function BorrowerDetailPage({ params }: PageProps) {
  const { id } = await params
  const detail = await getBorrowerById(id)

  if (!detail) {
    notFound()
  }

  const { borrower, loans } = detail

  return (
    <div className="flex flex-col gap-6">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/dashboard/borrowers" className="hover:text-foreground transition-colors">
          Borrowers
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium">{borrower.full_name}</span>
      </div>

      <PageHeader
        title={borrower.full_name}
        subtitle={`Borrower since ${formatManila(borrower.created_at, 'MMMM yyyy')}`}
        action={
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/borrowers">
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Back
            </Link>
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Borrower Profile Card */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Profile</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-muted p-2">
                <User className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Full Name</p>
                <p className="font-medium">{borrower.full_name}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="rounded-full bg-muted p-2">
                <Briefcase className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Occupation</p>
                <p className="font-medium">{borrower.occupation}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="rounded-full bg-muted p-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="font-medium break-all">{borrower.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="rounded-full bg-muted p-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Phone</p>
                <p className="font-medium">{borrower.phone}</p>
              </div>
            </div>

            <div className="border-t pt-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Bank Details
              </p>

              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-muted p-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Bank</p>
                    <p className="font-medium">{borrower.bank_name}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-muted p-2">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Account Name</p>
                    <p className="font-medium">{borrower.account_name}</p>
                  </div>
                </div>

                <div className="ml-11">
                  <p className="text-xs text-muted-foreground">Account Number</p>
                  <p className="font-mono font-medium">{borrower.account_number}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Loan History */}
        <div className="flex flex-col gap-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Loan History</h2>
            <Button asChild size="sm">
              <Link href={`/dashboard/loans/new?borrowerId=${borrower.id}`}>Create Loan</Link>
            </Button>
          </div>

          {loans.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No loans yet for this borrower.</p>
                <Button asChild className="mt-4" size="sm">
                  <Link href={`/dashboard/loans/new?borrowerId=${borrower.id}`}>
                    Create First Loan
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Principal</TableHead>
                    <TableHead className="hidden sm:table-cell">Term</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden md:table-cell">Start Date</TableHead>
                    <TableHead className="w-16" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loans.map((loan) => (
                    <TableRow key={loan.id}>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            loan.loan_type === 'flat_interest'
                              ? 'border-blue-400 text-blue-700'
                              : 'border-purple-400 text-purple-700'
                          }
                        >
                          {loan.loan_type === 'flat_interest' ? 'Flat' : 'Diminishing'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <CurrencyDisplay centavos={loan.principal} />
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground">
                        {loan.term_months} mo.
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={loan.status} />
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                        {formatManila(loan.start_date, 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>
                        <Button asChild variant="ghost" size="sm">
                          <Link href={`/dashboard/loans/${loan.id}`}>View</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
