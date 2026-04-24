import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const mocks = vi.hoisted(() => ({
  createTicketFromCapturedInput: vi.fn(),
  resolveOwnerUserId: vi.fn(),
}))

vi.mock('@/features/tickets/server/capture', () => ({ createTicketFromCapturedInput: mocks.createTicketFromCapturedInput }))
vi.mock('@/lib/auth/owner', () => ({ resolveOwnerUserId: mocks.resolveOwnerUserId }))

describe('POST /api/webhooks/openclaw', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubEnv('OPENCLAW_HOOK_TOKEN', 'hook-secret')
    mocks.createTicketFromCapturedInput.mockReset()
    mocks.resolveOwnerUserId.mockReset()
  })

  afterEach(() => { vi.unstubAllEnvs() })

  it('retorna 401 con token inválido', async () => {
    const { POST } = await import('./route')
    const res = await POST(new Request('http://localhost/api/webhooks/openclaw', {
      method: 'POST',
      headers: { authorization: 'Bearer wrong' },
      body: JSON.stringify({ text: 'hola' }),
    }))
    expect(res.status).toBe(401)
  })

  it('retorna 503 si no hay owner configurado', async () => {
    mocks.resolveOwnerUserId.mockResolvedValue(null)
    const { POST } = await import('./route')
    const res = await POST(new Request('http://localhost/api/webhooks/openclaw', {
      method: 'POST',
      headers: { authorization: 'Bearer hook-secret' },
      body: JSON.stringify({ text: 'hola' }),
    }))
    expect(res.status).toBe(503)
  })

  it('crea ticket con token y owner válidos', async () => {
    mocks.resolveOwnerUserId.mockResolvedValue('owner-1')
    mocks.createTicketFromCapturedInput.mockResolvedValue({
      id: 't1', title: 'Hola', priority: 'ALTA', context: 'NEGOCIO', dueDate: null,
    })
    const { POST } = await import('./route')
    const res = await POST(new Request('http://localhost/api/webhooks/openclaw', {
      method: 'POST',
      headers: { authorization: 'Bearer hook-secret' },
      body: JSON.stringify({ text: 'hola mundo' }),
    }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
  })

  it('retorna 400 si text está vacío', async () => {
    mocks.resolveOwnerUserId.mockResolvedValue('owner-1')
    const { POST } = await import('./route')
    const res = await POST(new Request('http://localhost/api/webhooks/openclaw', {
      method: 'POST',
      headers: { authorization: 'Bearer hook-secret' },
      body: JSON.stringify({ text: '' }),
    }))
    expect(res.status).toBe(400)
  })
})
