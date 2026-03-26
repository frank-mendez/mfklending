// TODO: implement event handling (document signed → update loans.contract_url + status)

import { createHmac, timingSafeEqual } from 'node:crypto'
import { type NextRequest, NextResponse } from 'next/server'

function verifySignwellSignature(rawBody: string, signature: string): boolean {
  const secret = process.env.SIGNWELL_WEBHOOK_SECRET
  if (!secret) return false

  const expected = createHmac('sha256', secret).update(rawBody).digest('hex')

  try {
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  } catch {
    // Buffers differ in length — always false, avoid timing leak
    return false
  }
}

export async function POST(request: NextRequest) {
  const signature = request.headers.get('x-signwell-signature') ?? ''
  const rawBody = await request.text()

  if (!verifySignwellSignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  // TODO: parse rawBody, switch on event type, update loan record
  const _payload = JSON.parse(rawBody)

  return NextResponse.json({ received: true })
}
