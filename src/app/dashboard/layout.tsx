import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'
import { DashboardNav } from '@/components/layout/DashboardNav'
import { MobileHeader } from '@/components/layout/MobileHeader'
import { QueryProvider } from '@/components/providers/QueryProvider'
import { SentryUserProvider } from '@/components/providers/SentryUserProvider'
import { Toaster } from '@/components/ui/sonner'
import { createClient } from '@/lib/supabase/server'

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const email = user.email ?? ''

  return (
    <QueryProvider>
      <SentryUserProvider userId={user.id} email={email} />
      <div className="flex min-h-screen">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:shrink-0 border-r bg-background">
          <DashboardNav email={email} />
        </aside>

        {/* Main content */}
        <div className="flex-1 flex flex-col min-w-0">
          <MobileHeader email={email} />
          <main className="flex-1 p-6">{children}</main>
        </div>
      </div>
      <Toaster richColors />
    </QueryProvider>
  )
}
