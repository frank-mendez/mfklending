import { logResult, supabase } from '../utils/supabase'

const PARTNERS = [
  { name: 'Frank', email: 'frank@mfklending.com' },
  { name: 'Francis', email: 'francis@mfklending.com' },
  { name: 'Kim', email: 'kim@mfklending.com' },
]

export async function seedPartners(): Promise<Record<string, string>> {
  console.log('Seeding partners...')

  const partnerMap: Record<string, string> = {}

  for (const partner of PARTNERS) {
    // Check if partner already exists by email
    const { data: existing, error: existingError } = await supabase
      .from('partners')
      .select('id, name')
      .eq('email', partner.email)
      .maybeSingle()

    if (existingError) {
      throw new Error(`Failed to check existing partner ${partner.email}: ${existingError.message}`)
    }

    if (existing) {
      console.log(`↷ Partner ${existing.name} already exists, skipping`)
      partnerMap[existing.name.toLowerCase()] = existing.id
    } else {
      // Insert new partner
      const { data: inserted, error } = await supabase
        .from('partners')
        .insert([{ name: partner.name, email: partner.email }])
        .select('id')
        .single()

      if (error) {
        throw new Error(`Failed to insert partner ${partner.name}: ${error.message}`)
      }

      console.log(`✓ Inserted partner ${partner.name}`)
      partnerMap[partner.name.toLowerCase()] = inserted.id
    }
  }

  // Verify by fetching all partners from DB
  const { data: allPartners, error: fetchError } = await supabase
    .from('partners')
    .select('id, name')

  if (fetchError) {
    throw new Error(`Failed to fetch partners: ${fetchError.message}`)
  }

  logResult('partners', allPartners?.length || 0)

  return partnerMap
}
