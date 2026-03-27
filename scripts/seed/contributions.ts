import { parseMonth, parsePHP } from '../utils/parse'
import { logResult, supabase } from '../utils/supabase'

type ContributionRow = {
  month: string
  frank: string | null
  francis: string | null
  kim: string | null
  remarks?: string | null
}

// Hardcoded contribution data
// null = no regular payment that month for that partner
const CONTRIBUTION_DATA: ContributionRow[] = [
  { month: "OCT '22", frank: '₱2,000.00', francis: '₱2,000.00', kim: '₱2,000.00' },
  { month: "NOV '22", frank: '₱2,000.00', francis: '₱2,000.00', kim: '₱2,000.00' },
  { month: "DEC '22", frank: '₱2,000.00', francis: '₱2,000.00', kim: '₱2,000.00' },
  { month: "JAN '23", frank: '₱2,000.00', francis: '₱2,000.00', kim: '₱2,000.00' },
  { month: "FEB '23", frank: '₱2,000.00', francis: '₱2,000.00', kim: '₱2,000.00' },
  { month: "MAR '23", frank: '₱2,000.00', francis: '₱2,000.00', kim: '₱2,000.00' },
  { month: "APR '23", frank: '₱2,000.00', francis: '₱2,000.00', kim: '₱2,000.00' },
  { month: "MAY '23", frank: null, francis: '₱4,000.00', kim: '₱2,000.00' },
  { month: "JUN '23", frank: null, francis: '₱2,000.00', kim: '₱4,000.00' },
  { month: "JUL '23", frank: null, francis: '₱3,000.00', kim: '₱3,000.00' },
  // AUG '23: Frank has special catch-up payment handled separately below
  {
    month: "AUG '23",
    frank: null,
    francis: '₱3,000.00',
    kim: '₱3,000.00',
    remarks: 'FRANK PAID ₱8,000.00 (FROM MISSED PAYMENTS)',
  },
  { month: "SEPT '23", frank: '₱6,000.00', francis: null, kim: null },
  { month: "OCT '23", frank: '₱6,000.00', francis: null, kim: null },
  { month: "NOV '23", frank: '₱2,000.00', francis: '₱2,000.00', kim: '₱2,000.00' },
  { month: "DEC '23", frank: '₱2,000.00', francis: '₱2,000.00', kim: '₱2,000.00' },
  { month: "JAN '24", frank: '₱3,000.00', francis: '₱3,000.00', kim: '₱3,000.00' },
  { month: "FEB '24", frank: '₱3,000.00', francis: '₱3,000.00', kim: '₱3,000.00' },
  { month: "MAR '24", frank: '₱3,000.00', francis: '₱3,000.00', kim: '₱3,000.00' },
  { month: "APR '24", frank: '₱3,000.00', francis: '₱3,000.00', kim: '₱3,000.00' },
  { month: "MAY '24", frank: '₱3,000.00', francis: '₱3,000.00', kim: '₱3,000.00' },
  { month: "JUN '24", frank: '₱3,000.00', francis: '₱3,000.00', kim: '₱3,000.00' },
  { month: "JUL '24", frank: '₱3,000.00', francis: '₱3,000.00', kim: '₱3,000.00' },
  { month: "AUG '24", frank: '₱3,000.00', francis: '₱3,000.00', kim: '₱3,000.00' },
  { month: "SEPT '24", frank: '₱3,000.00', francis: '₱3,000.00', kim: '₱3,000.00' },
  { month: "OCT '24", frank: '₱3,000.00', francis: '₱3,000.00', kim: '₱3,000.00' },
  { month: "NOV '24", frank: '₱3,000.00', francis: '₱3,000.00', kim: '₱3,000.00' },
  { month: "DEC '24", frank: '₱3,000.00', francis: '₱3,000.00', kim: '₱3,000.00' },
  { month: "JAN '25", frank: '₱3,000.00', francis: '₱3,000.00', kim: '₱3,000.00' },
  { month: "FEB '25", frank: '₱3,000.00', francis: '₱3,000.00', kim: '₱3,000.00' },
  { month: "MAR '25", frank: '₱3,000.00', francis: '₱3,000.00', kim: '₱3,000.00' },
  { month: "APR '25", frank: '₱3,000.00', francis: '₱3,000.00', kim: '₱3,000.00' },
  { month: "MAY '25", frank: '₱3,000.00', francis: '₱3,000.00', kim: '₱3,000.00' },
  { month: "JUNE '25", frank: '₱3,000.00', francis: '₱3,000.00', kim: '₱3,000.00' },
  { month: "JUL '25", frank: '₱3,000.00', francis: '₱3,000.00', kim: '₱3,000.00' },
  { month: "AUG '25", frank: '₱3,000.00', francis: '₱3,000.00', kim: '₱3,000.00' },
  { month: "SEPT '25", frank: '₱3,000.00', francis: '₱3,000.00', kim: '₱3,000.00' },
  { month: "OCT '25", frank: '₱3,000.00', francis: '₱3,000.00', kim: '₱3,000.00' },
  { month: "NOV '25", frank: '₱3,000.00', francis: '₱3,000.00', kim: '₱3,000.00' },
  { month: "DEC '25", frank: '₱3,000.00', francis: '₱3,000.00', kim: '₱3,000.00' },
  { month: "JAN '26", frank: '₱3,000.00', francis: '₱3,000.00', kim: '₱3,000.00' },
  { month: "FEB '26", frank: '₱3,000.00', francis: '₱3,000.00', kim: '₱3,000.00' },
  { month: "MAR '26", frank: '₱3,000.00', francis: '₱3,000.00', kim: '₱3,000.00' },
]

// Frank contributed ₱119,000 — Sep/Oct '23 entries are ₱6,000 each (he covered all 3 partners
// those months while Francis and Kim show null). Francis and Kim are the standard ₱111,000.
const EXPECTED_TOTALS: Record<string, number> = {
  frank: 11900000, // ₱119,000.00
  francis: 11100000, // ₱111,000.00
  kim: 11100000, // ₱111,000.00
}

export async function seedContributions(partnerIds: Record<string, string>): Promise<void> {
  const partners = ['frank', 'francis', 'kim'] as const

  let insertedCount = 0

  for (const row of CONTRIBUTION_DATA) {
    const monthISO = parseMonth(row.month)

    for (const partner of partners) {
      const amountStr = row[partner]

      // Skip null entries (no regular payment this month for this partner)
      if (amountStr === null) continue

      const partnerId = partnerIds[partner]
      const amount = parsePHP(amountStr)

      // Idempotency check: skip if (partner_id, month) already exists
      const { data: existing, error: checkError } = await supabase
        .from('contributions')
        .select('id')
        .eq('partner_id', partnerId)
        .eq('month', monthISO)
        .maybeSingle()

      if (checkError) {
        throw new Error(
          `Error checking existing contribution for ${partner} ${monthISO}: ${checkError.message}`
        )
      }

      if (existing) {
        // Already seeded — skip silently
        continue
      }

      const { error: insertError } = await supabase.from('contributions').insert({
        partner_id: partnerId,
        amount,
        month: monthISO,
      })

      if (insertError) {
        throw new Error(
          `Error inserting contribution for ${partner} ${monthISO}: ${insertError.message}`
        )
      }

      insertedCount++
    }
  }

  // Special case: Frank's AUG '23 catch-up lump-sum payment
  const aug23ISO = parseMonth("AUG '23")
  const frankId = partnerIds.frank
  const frankCatchUpRemarks = 'FRANK PAID ₱8,000.00 (FROM MISSED PAYMENTS)'
  const frankCatchUpAmount = parsePHP('₱8,000.00')

  // Idempotency: check by (partner_id, month) to align with DB UNIQUE constraint
  const { data: existingCatchUp, error: catchUpCheckError } = await supabase
    .from('contributions')
    .select('id')
    .eq('partner_id', frankId)
    .eq('month', aug23ISO)
    .maybeSingle()

  if (catchUpCheckError) {
    throw new Error(`Error checking Frank AUG '23 catch-up: ${catchUpCheckError.message}`)
  }

  if (!existingCatchUp) {
    const { error: catchUpInsertError } = await supabase.from('contributions').insert({
      partner_id: frankId,
      amount: frankCatchUpAmount,
      month: aug23ISO,
      remarks: frankCatchUpRemarks,
    })

    if (catchUpInsertError) {
      throw new Error(`Error inserting Frank AUG '23 catch-up: ${catchUpInsertError.message}`)
    }

    insertedCount++
  }

  // Verification: check total per partner
  const partnerNames: Record<string, string> = {
    frank: 'Frank',
    francis: 'Francis',
    kim: 'Kim',
  }

  for (const partner of partners) {
    const partnerId = partnerIds[partner]
    const name = partnerNames[partner]

    const { data, error } = await supabase
      .from('contributions')
      .select('amount')
      .eq('partner_id', partnerId)

    if (error) {
      console.error(`✗ ERROR: Could not fetch contributions for ${name}: ${error.message}`)
      continue
    }

    const total = (data ?? []).reduce((sum: number, row: { amount: number }) => sum + row.amount, 0)

    const expected = EXPECTED_TOTALS[name] ?? 11100000
    if (total !== expected) {
      console.error(`✗ ERROR: ${name} total = ${total}, expected ${expected}`)
    } else {
      console.log(`✓ ${name} total = ₱${(expected / 100).toLocaleString('en-PH')} ✓`)
    }
  }

  logResult('contributions', insertedCount)
}
