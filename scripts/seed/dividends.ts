import { logResult, supabase } from '../utils/supabase'

const DIVIDENDS = [
  { partner: 'frank', amount: 1000000, distributed_at: '2025-11-01' },
  { partner: 'francis', amount: 1000000, distributed_at: '2025-11-01' },
  { partner: 'kim', amount: 1000000, distributed_at: '2025-11-01' },
]

export async function seedDividends(partnerIds: Record<string, string>): Promise<void> {
  console.log('Seeding dividends...')

  let insertedCount = 0

  for (const dividend of DIVIDENDS) {
    const partnerId = partnerIds[dividend.partner]
    if (!partnerId) {
      throw new Error(`Partner ID not found for: ${dividend.partner}`)
    }

    // Check if dividend already exists for this partner and date
    const { data: existing, error: checkError } = await supabase
      .from('dividends')
      .select('id')
      .eq('partner_id', partnerId)
      .eq('distributed_at', dividend.distributed_at)
      .maybeSingle()

    if (checkError) {
      throw new Error(`Failed to check dividend for ${dividend.partner}: ${checkError.message}`)
    }

    if (existing) {
      console.log(
        `↷ Dividend for ${dividend.partner} on ${dividend.distributed_at} already exists, skipping`
      )
    } else {
      // Insert new dividend
      const { error: insertError } = await supabase
        .from('dividends')
        .insert([
          {
            partner_id: partnerId,
            amount: dividend.amount,
            distributed_at: dividend.distributed_at,
          },
        ])
        .select('id')
        .single()

      if (insertError) {
        throw new Error(`Failed to insert dividend for ${dividend.partner}: ${insertError.message}`)
      }

      console.log(`✓ Inserted dividend for ${dividend.partner} on ${dividend.distributed_at}`)
      insertedCount++
    }
  }

  logResult('dividends', insertedCount)
}
