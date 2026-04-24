import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireCapability: vi.fn(),
  fetch: vi.fn(),
}))

vi.mock('@/lib/auth/permissions', () => ({ requireCapability: mocks.requireCapability }))

vi.stubGlobal('fetch', mocks.fetch)

describe('GET /api/user/openclaw-status', () => {
  beforeEach(() => {
    mocks.requireCapability.mockReset()
    mocks.fetch.mockReset()
    process.env.OPENCLAW_BASE_URL = 'http://100.80.59.3:18789'
    process.env.OPENCLAW_GATEWAY_TOKEN = 'test-token'
  })

  it('retorna 401 si no hay sesión', async () => {
    mocks.requireCapability.mockResolvedValue({
      response: Response.json({ success: false, code: 'UNAUTHORIZED' }, { status: 401 }),
    })
    const { GET } = await import('./route')
    const res = await GET(new Request('http://localhost/api/user/openclaw-status')) as Response
    expect(res.status).toBe(401)
  })

  it('retorna 403 si el actor no tiene gateway.read', async () => {
    mocks.requireCapability.mockResolvedValue({
      response: Response.json({ success: false, code: 'FORBIDDEN' }, { status: 403 }),
    })

    const { GET } = await import('./route')
    const res = await GET(new Request('http://localhost/api/user/openclaw-status')) as Response

    expect(res.status).toBe(403)
    expect(mocks.fetch).not.toHaveBeenCalled()
  })

  it('retorna available:true cuando OpenClaw responde en /v1/models', async () => {
    mocks.requireCapability.mockResolvedValue({
      session: { user: { id: 'owner-1' } },
      userId: 'owner-1',
      role: 'OWNER',
      capabilities: ['gateway.read'],
    })
    mocks.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          { id: 'openclaw', object: 'model' },
        ],
      }),
    })

    const { GET } = await import('./route')
    const res = await GET(new Request('http://localhost/api/user/openclaw-status')) as Response
    const body = await res.json()

    expect(body.data.available).toBe(true)
    expect(body.data.version).toBeNull()
    expect(mocks.fetch).toHaveBeenCalledWith(
      'http://100.80.59.3:18789/v1/models',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer test-token' }),
      })
    )
  })

  it('retorna available:false cuando OpenClaw no responde', async () => {
    mocks.requireCapability.mockResolvedValue({
      session: { user: { id: 'owner-1' } },
      userId: 'owner-1',
      role: 'OWNER',
      capabilities: ['gateway.read'],
    })
    mocks.fetch.mockRejectedValue(new Error('connection refused'))

    const { GET } = await import('./route')
    const res = await GET(new Request('http://localhost/api/user/openclaw-status')) as Response
    const body = await res.json()

    expect(body.data.available).toBe(false)
    expect(body.data.version).toBeNull()
  })

  it('retorna available:false cuando respuesta HTTP no es ok', async () => {
    mocks.requireCapability.mockResolvedValue({
      session: { user: { id: 'owner-1' } },
      userId: 'owner-1',
      role: 'OWNER',
      capabilities: ['gateway.read'],
    })
    mocks.fetch.mockResolvedValue({ ok: false, status: 401, json: async () => ({}) })

    const { GET } = await import('./route')
    const res = await GET(new Request('http://localhost/api/user/openclaw-status')) as Response
    const body = await res.json()

    expect(body.data.available).toBe(false)
  })
})
