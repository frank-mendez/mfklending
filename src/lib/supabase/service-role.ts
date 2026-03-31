/**
 * Supabase client that uses the service role key — bypasses RLS.
 * ONLY import this from server-side code (Server Actions, Route Handlers).
 * Never import from components or client-side modules.
 */
import { createClient } from '@supabase/supabase-js'

function getEnv(key: string): string {
  const value = process.env[key]
  if (!value) throw new Error(`Missing environment variable: ${key}`)
  return value
}

export function createServiceRoleClient() {
  return createClient(getEnv('NEXT_PUBLIC_SUPABASE_URL'), getEnv('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false },
  })
}
