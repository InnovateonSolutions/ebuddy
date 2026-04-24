import { describe, it, expect, vi, beforeEach } from 'vitest'

const mocks = vi.hoisted(() => ({
  createWhatsAppChallengeResponse: vi.fn(),
  handleIncomingWhatsAppWebhook: vi.fn(),
}))

vi.mock('@/features/messaging/whatsapp/server/service', () => ({
  createWhatsAppChallengeResponse: mocks.createWhatsAppChallengeResponse,
  handleIncomingWhatsAppWebhook: mocks.handleIncomingWhatsAppWebhook,
}))

describe('GET /api/webhooks/whatsapp', () => {
  beforeEach(() => { vi.resetModules(); mocks.createWhatsAppChallengeResponse.mockReset() })

  it('delega al challenge handler', async () => {
    mocks.createWhatsAppChallengeResponse.mockReturnValue(new Response('challenge_token', { status: 200 }))
    const { GET } = await import('./route')
    const req = new Request('http://localhost/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=tok&hub.challenge=xyz')
    const res = await GET(req) as Response
    expect(res.status).toBe(200)
    expect(mocks.createWhatsAppChallengeResponse).toHaveBeenCalledWith(req)
  })
})

describe('POST /api/webhooks/whatsapp', () => {
  beforeEach(() => { vi.resetModules(); mocks.handleIncomingWhatsAppWebhook.mockReset() })

  it('procesa el mensaje y retorna ok', async () => {
    mocks.handleIncomingWhatsAppWebhook.mockResolvedValue(undefined)
    const { POST } = await import('./route')
    const res = await POST(new Request('http://localhost/api/webhooks/whatsapp', {
      method: 'POST',
      body: JSON.stringify({ entry: [] }),
    })) as Response
    expect(res.status).toBe(200)
    expect(mocks.handleIncomingWhatsAppWebhook).toHaveBeenCalled()
  })

  it('retorna 400 con body inválido', async () => {
    const { POST } = await import('./route')
    const res = await POST(new Request('http://localhost/api/webhooks/whatsapp', {
      method: 'POST',
      body: 'not-json',
    })) as Response
    expect(res.status).toBe(400)
  })
})
