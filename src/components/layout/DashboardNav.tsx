'use client'

import {
  ArrowLeftRight,
  Banknote,
  BarChart3,
  Bell,
  LayoutDashboard,
  LogOut,
  PiggyBank,
  Upload,
  Users,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { signOut } from '@/lib/actions/auth'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/loans', label: 'Loans', icon: Banknote, exact: false },
  { href: '/borrowers', label: 'Borrowers', icon: Users, exact: false },
  { href: '/stash', label: 'Stash', icon: PiggyBank, exact: false },
  { href: '/reminders', label: 'Reminders', icon: Bell, exact: false },
  { href: '/transactions', label: 'Transactions', icon: ArrowLeftRight, exact: false },
  { href: '/reports', label: 'Reports', icon: BarChart3, exact: false },
  { href: '/import', label: 'Import', icon: Upload, exact: false },
]

interface DashboardNavProps {
  email: string
}

export function DashboardNav({ email }: DashboardNavProps) {
  const pathname = usePathname()

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-6 py-5 border-b">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
            M
          </div>
          <div>
            <p className="font-semibold text-sm leading-tight">MFK Lending</p>
            <p className="text-xs text-muted-foreground">Corp</p>
          </div>
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon, exact }) => {
          const isActive = exact ? pathname === href : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="border-t px-3 py-4 space-y-3">
        <div className="px-3">
          <p className="text-xs text-muted-foreground truncate">{email}</p>
        </div>
        <form action={signOut}>
          <Button
            type="submit"
            variant="ghost"
            className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
            size="sm"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </form>
      </div>
    </div>
  )
}
