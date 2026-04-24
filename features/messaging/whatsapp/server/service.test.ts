import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  createTicket: vi.fn(),
  sendReply: vi.fn(),
  resolveOwnerUserId: vi.fn(),
}))

vi.mock('@/features/tickets/server/capture', () => ({
  createTicketFromCapturedInput: mocks.createTicket,
}))

vi.mock('@/features/messaging/whatsapp/server/reply', () => ({
  sendWhatsAppReply: mocks.sendReply,
}))

vi.mock('@/lib/auth/owner', () => ({
  resolveOwnerUserId: mocks.resolveOwnerUserId,
}))

import { createWhatsAppChallengeResponse, handleIncomingWhatsAppWebhook } from './service'

function makeWebhookBody(text: string, from = '521234567890') {
  return {
    entry: [{
      changes: [{
        value: {
          messages: [{ type: 'text', text: { body: text }, from }],
        },
      }],
    }],
  }
}

describe('createWhatsAppChallengeResponse', () => {
  it('aprueba el challenge cuando VERIFY_TOKEN coincide', () => {
    const originalEnv = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN
    process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN = 'secret123'

    const req = new Request(
      'https://example.com/webhook?hub.mode=subscribe&hub.verify_token=secret123&hub.challenge=challenge_abc'
    )
    const res = createWhatsAppChallengeResponse(req)

    expect(res.status).toBe(200)
    process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN = originalEnv
  })

  it('rechaza cuando el token no coincide', () => {
    const originalEnv = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN
    process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN = 'secret123'

    const req = new Request(
      'https://example.com/webhook?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=x'
    )
    const res = createWhatsAppChallengeResponse(req)

    expect(res.status).toBe(403)
    process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN = originalEnv
  })

  it('rechaza cuando VERIFY_TOKEN no está configurado', () => {
    const originalEnv = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN
    delete process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN

    const req = new Request(
      'https://example.com/webhook?hub.mode=subscribe&hub.verify_token=anything&hub.challenge=x'
    )
    const res = createWhatsAppChallengeResponse(req)

    expect(res.status).toBe(403)
    process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN = originalEnv
  })
})

describe('handleIncomingWhatsAppWebhook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.resolveOwnerUserId.mockResolvedValue('user-owner')
    mocks.createTicket.mockResolvedValue({
      id: 't1',
      context: 'NEGOCIO',
      title: 'Revisar propuesta',
      priority: 'ALTA',
    })
    mocks.sendReply.mockResolvedValue(undefined)
  })

  it('crea ticket y envía confirmación', async () => {
    await handleIncomingWhatsAppWebhook(makeWebhookBody('revisar propuesta cliente'))

    expect(mocks.createTicket).toHaveBeenCalledWith(
      'user-owner',
      'revisar propuesta cliente',
      undefined,
      expect.any(Number)
    )
    expect(mocks.sendReply).toHaveBeenCalledWith(
      '521234567890',
      expect.stringContaining('Revisar propuesta')
    )
  })

  it('envía mensaje de error cuando createTicket falla', async () => {
    mocks.createTicket.mockRejectedValue(new Error('AI timeout'))

    await handleIncomingWhatsAppWebhook(makeWebhookBody('texto'))

    expect(mocks.sendReply).toHaveBeenCalledWith(
      '521234567890',
      expect.stringContaining('No pude crear el ticket')
    )
  })

  it('ignora mensajes que no son de tipo text', async () => {
    const body = {
      entry: [{
        changes: [{
          value: { messages: [{ type: 'image', from: '521234567890' }] },
        }],
      }],
    }

    await handleIncomingWhatsAppWebhook(body)

    expect(mocks.createTicket).not.toHaveBeenCalled()
  })

  it('ignora cuando resolveOwnerUserId retorna null', async () => {
    mocks.resolveOwnerUserId.mockResolvedValue(null)

    await handleIncomingWhatsAppWebhook(makeWebhookBody('texto'))

    expect(mocks.createTicket).not.toHaveBeenCalled()
  })

  it('ignora payloads vacíos o malformados', async () => {
    await handleIncomingWhatsAppWebhook({})
    await handleIncomingWhatsAppWebhook(null)
    await handleIncomingWhatsAppWebhook({ entry: [] })

    expect(mocks.createTicket).not.toHaveBeenCalled()
  })
})
