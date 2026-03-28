'use client'

import { useActionState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { ActionState } from '@/lib/actions'
import { signIn } from '@/lib/actions/auth'

const initialState: ActionState = { success: false, message: '' }

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(signIn, initialState)

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Wordmark */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary text-primary-foreground font-bold text-xl mb-2">
            M
          </div>
          <h1 className="text-2xl font-bold tracking-tight">MFK Lending Corp</h1>
          <p className="text-sm text-muted-foreground">Internal Management System</p>
        </div>

        <Card>
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl">Partner Login</CardTitle>
            <CardDescription>Sign in to access the lending dashboard</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={formAction} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="partner@mfklending.com"
                  required
                />
                {state.errors?.email && (
                  <p className="text-xs text-destructive">{state.errors.email[0]}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                />
                {state.errors?.password && (
                  <p className="text-xs text-destructive">{state.errors.password[0]}</p>
                )}
              </div>

              {!state.success && state.message && !state.errors && (
                <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
                  {state.message}
                </p>
              )}

              <Button type="submit" className="w-full" disabled={pending}>
                {pending ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                    Signing in…
                  </span>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
