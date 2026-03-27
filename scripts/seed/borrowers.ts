import { existsSync } from 'node:fs'
import path from 'node:path'
import { parseCSV } from '../utils/parse'
import { logResult, supabase } from '../utils/supabase'

const KNOWN_BORROWER = {
  full_name: 'Melca Sham Monterona Ybañez',
  age: 27,
  occupation: 'Manager',
  email: 'melcasham25@gmail.com',
  phone: '09852289663',
  bank_name: 'BPI',
  account_name: 'Melca Sham Monterona Ybañez',
  account_number: '0089007522',
}

export async function seedBorrowers(): Promise<Record<string, string>> {
  console.log('Seeding borrowers...')

  const borrowerMap: Record<string, string> = {}

  // Step 1: Pre-seed known borrower
  const { data: existingKnown, error: existingKnownError } = await supabase
    .from('borrowers')
    .select('id, full_name')
    .eq('email', KNOWN_BORROWER.email)
    .maybeSingle()

  if (existingKnownError) {
    throw new Error(
      `Failed to query known borrower ${KNOWN_BORROWER.full_name}: ${existingKnownError.message}`
    )
  }

  if (existingKnown) {
    console.log(`↷ Borrower ${existingKnown.full_name} already exists, skipping`)
    borrowerMap[existingKnown.full_name.toLowerCase()] = existingKnown.id
  } else {
    const { data: inserted, error } = await supabase
      .from('borrowers')
      .insert([KNOWN_BORROWER])
      .select('id')
      .single()

    if (error) {
      throw new Error(
        `Failed to insert known borrower ${KNOWN_BORROWER.full_name}: ${error.message}`
      )
    }

    console.log(`✓ Inserted borrower ${KNOWN_BORROWER.full_name}`)
    borrowerMap[KNOWN_BORROWER.full_name.toLowerCase()] = inserted.id
  }

  // Step 2: Attempt to read lending.csv
  const lendingCsvPath = path.join(process.cwd(), 'scripts', 'data', 'lending.csv')

  if (!existsSync(lendingCsvPath)) {
    console.log('⚠ scripts/data/lending.csv not found — skipping CSV borrowers')
  } else {
    const rows = parseCSV(lendingCsvPath)

    // Extract unique borrowers by email
    const borrowersByEmail = new Map<string, Record<string, string>>()
    for (const row of rows) {
      const email = row.Email?.trim()
      if (email && !borrowersByEmail.has(email)) {
        borrowersByEmail.set(email, row)
      }
    }

    // Insert each unique borrower (idempotent by email)
    for (const [email, row] of borrowersByEmail) {
      const { data: existing, error: existingError } = await supabase
        .from('borrowers')
        .select('id, full_name')
        .eq('email', email)
        .maybeSingle()

      if (existingError) {
        throw new Error(`Failed to check existing borrower ${email}: ${existingError.message}`)
      }

      if (existing) {
        console.log(`↷ Borrower ${existing.full_name} already exists, skipping`)
        borrowerMap[existing.full_name.toLowerCase()] = existing.id
      } else {
        const { data: inserted, error } = await supabase
          .from('borrowers')
          .insert([
            {
              full_name: row['Full Name'] || '',
              age: row.Age ? parseInt(row.Age, 10) : null,
              occupation: row.Occupation || null,
              email: email,
              phone: row['Contact Number'] || null,
              bank_name: row.Bank || null,
              account_name: row['Account Name'] || null,
              account_number: row['Account Number'] || null,
            },
          ])
          .select('id')
          .single()

        if (error) {
          throw new Error(`Failed to insert borrower ${row['Full Name']}: ${error.message}`)
        }

        console.log(`✓ Inserted borrower ${row['Full Name']}`)
        borrowerMap[row['Full Name'].toLowerCase()] = inserted.id
      }
    }
  }

  // Step 3: Fetch all borrowers and verify
  const { data: allBorrowers, error: fetchError } = await supabase
    .from('borrowers')
    .select('id, full_name')

  if (fetchError) {
    throw new Error(`Failed to fetch borrowers: ${fetchError.message}`)
  }

  logResult('borrowers', allBorrowers?.length || 0)

  return borrowerMap
}
