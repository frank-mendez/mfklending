import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl) {
  throw new Error('Missing env var: NEXT_PUBLIC_SUPABASE_URL')
}

if (!supabaseServiceRoleKey) {
  throw new Error('Missing env var: SUPABASE_SERVICE_ROLE_KEY')
}

// Create Supabase client with service role key (bypasses RLS)
// auth options required for service role to properly bypass RLS in JS v2
export const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
})

/**
 * Log seeding result in a consistent format
 * @param table - Table name that was seeded
 * @param count - Number of rows inserted
 */
export function logResult(table: string, count: number): void {
  console.log(`✓ Seeded ${count} rows into ${table}`)
}
