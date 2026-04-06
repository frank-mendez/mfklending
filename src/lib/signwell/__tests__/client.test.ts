import crypto from 'node:crypto'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// We test validateWebhookSignature by mocking env var
const testSecret = 'test-webhook-secret'
const testPayload = JSON.stringify({ event: 'document_completed', document: { id: 'doc-123' } })
const validSig = crypto.createHmac('sha256', testSecret).update(testPayload).digest('hex')

describe('validateWebhookSignature', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubEnv('SIGNWELL_WEBHOOK_SECRET', testSecret)
  })

  it('returns true for a valid signature', async () => {
    const { validateWebhookSignature } = await import('../client')
    expect(validateWebhookSignature(testPayload, validSig)).toBe(true)
  })

  it('returns false for an invalid signature', async () => {
    const { validateWebhookSignature } = await import('../client')
    expect(validateWebhookSignature(testPayload, 'badsignature')).toBe(false)
  })

  it('returns false when payload is tampered', async () => {
    const { validateWebhookSignature } = await import('../client')
    const tamperedPayload = testPayload + 'tampered'
    expect(validateWebhookSignature(tamperedPayload, validSig)).toBe(false)
  })

  it('returns false when signature is empty string', async () => {
    const { validateWebhookSignature } = await import('../client')
    expect(validateWebhookSignature(testPayload, '')).toBe(false)
  })

  it('returns false when SIGNWELL_WEBHOOK_SECRET is not set', async () => {
    vi.stubEnv('SIGNWELL_WEBHOOK_SECRET', '')
    const { validateWebhookSignature } = await import('../client')
    expect(validateWebhookSignature(testPayload, validSig)).toBe(false)
  })
})
