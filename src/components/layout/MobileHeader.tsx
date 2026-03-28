'use client'

import { Menu } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { formatManila } from '@/lib/utils/date'
import { DashboardNav } from './DashboardNav'

interface MobileHeaderProps {
  email: string
}

export function MobileHeader({ email }: MobileHeaderProps) {
  const [open, setOpen] = useState(false)
  const today = formatManila(new Date().toISOString(), 'EEEE, MMMM d, yyyy')

  return (
    <header className="lg:hidden flex items-center justify-between px-4 py-3 border-b bg-background">
      <Button variant="ghost" size="icon" onClick={() => setOpen(true)}>
        <Menu className="h-5 w-5" />
        <span className="sr-only">Open navigation</span>
      </Button>
      <p className="text-sm text-muted-foreground">{today}</p>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="p-0 w-64">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <DashboardNav email={email} />
        </SheetContent>
      </Sheet>
    </header>
  )
}
