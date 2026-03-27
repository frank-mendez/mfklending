import 'dotenv/config'
import * as readline from 'node:readline'
import { supabase } from './utils/supabase'

// Guard: Prevent reset in production
if (process.env.NODE_ENV === 'production') {
  throw new Error('Cannot reset in production')
}

// Guard: Require explicit opt-in regardless of NODE_ENV.
// NODE_ENV is often unset locally, so this prevents accidental wipes of any
// Supabase project (including prod) when the env var isn't configured.
if (process.env.SEED_RESET_ALLOWED !== 'true') {
  throw new Error(
    'Database reset is disabled. Set SEED_RESET_ALLOWED=true in .env.local to allow this operation.'
  )
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

// Function to prompt user for confirmation
function promptConfirmation(): Promise<string> {
  return new Promise((resolve) => {
    rl.question("⚠️  This will delete ALL data. Type 'yes' to continue: ", (answer) => {
      resolve(answer)
    })
  })
}

// Main reset function
async function reset() {
  const answer = await promptConfirmation()
  rl.close()

  if (answer !== 'yes') {
    console.log('Aborted.')
    process.exit(0)
  }

  // Tables in safe dependency order (to avoid FK constraint errors)
  const tables = [
    'payments',
    'loan_schedules',
    'loans',
    'borrowers',
    'dividends',
    'contributions',
    'partners',
    'bank_transactions',
  ]

  console.log('\nClearing tables...\n')

  for (const table of tables) {
    try {
      // Delete all rows using a safe filter (Supabase requires a filter)
      const { error } = await supabase
        .from(table)
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000')

      if (error) {
        console.error(`✗ Error clearing ${table}:`, error.message)
        process.exit(1)
      }

      console.log(`✓ Cleared ${table}`)
    } catch (err) {
      console.error(`✗ Error clearing ${table}:`, err)
      process.exit(1)
    }
  }

  console.log('\n✅ All tables cleared.')
  process.exit(0)
}

reset().catch((err) => {
  console.error('Reset failed:', err)
  process.exit(1)
})
