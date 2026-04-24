import { describe, it, expect, vi, beforeEach } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireAuthenticatedUserId: vi.fn(),
  requireCapability: vi.fn(),
  requireStepUp: vi.fn(),
  getApiKeyMeta: vi.fn(),
  generateApiKey: vi.fn(),
}))

vi.mock('@/lib/auth/request', () => ({ requireAuthenticatedUserId: mocks.requireAuthenticatedUserId }))
vi.mock('@/lib/auth/permissions', () => ({
  requireCapability: mocks.requireCapability,
  requireStepUp: mocks.requireStepUp,
}))
vi.mock('@/features/settings/server/service', () => ({
  getApiKeyMeta: mocks.getApiKeyMeta,
  generateApiKey: mocks.generateApiKey,
}))

describe('GET /api/user/api-key', () => {
  beforeEach(() => { vi.resetModules(); mocks.requireAuthenticatedUserId.mockReset(); mocks.getApiKeyMeta.mockReset() })

  it('retorna 401 sin autenticación', async () => {
    mocks.requireAuthenticatedUserId.mockReturnValue({ response: new Response('', { status: 401 }) })
    const { GET } = await import('./route')
    const res = await GET(new Request('http://localhost/api/user/api-key')) as Response
    expect(res.status).toBe(401)
  })

  it('retorna metadata de la API key', async () => {
    mocks.requireAuthenticatedUserId.mockReturnValue({ userId: 'u1' })
    mocks.getApiKeyMeta.mockResolvedValue({ hasKey: true, preview: 'eb_****' })
    const { GET } = await import('./route')
    const res = await GET(new Request('http://localhost/api/user/api-key')) as Response
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.hasKey).toBe(true)
  })
})

describe('POST /api/user/api-key', () => {
  beforeEach(() => {
    vi.resetModules()
    mocks.requireCapability.mockReset()
    mocks.requireStepUp.mockReset()
    mocks.generateApiKey.mockReset()
  })

  it('retorna 403 sin capability', async () => {
    mocks.requireCapability.mockResolvedValue({ response: new Response('', { status: 403 }) })
    const { POST } = await import('./route')
    const res = await POST(new Request('http://localhost/api/user/api-key', { method: 'POST' })) as Response
    expect(res.status).toBe(403)
  })

  it('genera nueva API key con capability y step-up válidos', async () => {
    mocks.requireCapability.mockResolvedValue({ userId: 'u1', role: 'OWNER', capabilities: ['secrets.manage'] })
    mocks.requireStepUp.mockResolvedValue({ userId: 'u1' })
    mocks.generateApiKey.mockResolvedValue({ key: 'eb_new_key', preview: 'eb_****' })
    const { POST } = await import('./route')
    const res = await POST(new Request('http://localhost/api/user/api-key', { method: 'POST' })) as Response
    expect(res.status).toBe(200)
  })
})
