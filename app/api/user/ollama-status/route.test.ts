import { describe, it, expect, vi, beforeEach } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireAuthenticatedUserId: vi.fn(),
  isAvailable: vi.fn(),
  fetch: vi.fn(),
}))

vi.mock('@/lib/auth/request', () => ({ requireAuthenticatedUserId: mocks.requireAuthenticatedUserId }))
vi.mock('@/lib/ai/ollama', () => ({ OllamaAIService: { isAvailable: mocks.isAvailable } }))
vi.stubGlobal('fetch', mocks.fetch)

describe('GET /api/user/ollama-status', () => {
  beforeEach(() => {
    vi.resetModules()
    mocks.requireAuthenticatedUserId.mockReset()
    mocks.isAvailable.mockReset()
    mocks.fetch.mockReset()
  })

  it('retorna 401 sin autenticación', async () => {
    mocks.requireAuthenticatedUserId.mockReturnValue({ response: new Response('', { status: 401 }) })
    const { GET } = await import('./route')
    const res = await GET(new Request('http://localhost/api/user/ollama-status')) as Response
    expect(res.status).toBe(401)
  })

  it('retorna available=false si Ollama no responde', async () => {
    mocks.requireAuthenticatedUserId.mockReturnValue({ userId: 'u1' })
    mocks.isAvailable.mockResolvedValue(false)
    const { GET } = await import('./route')
    const res = await GET(new Request('http://localhost/api/user/ollama-status')) as Response
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.available).toBe(false)
    expect(body.data.models).toEqual([])
  })

  it('retorna modelos cuando Ollama está disponible', async () => {
    mocks.requireAuthenticatedUserId.mockReturnValue({ userId: 'u1' })
    mocks.isAvailable.mockResolvedValue(true)
    mocks.fetch.mockResolvedValue(new Response(JSON.stringify({ models: [{ name: 'llama3' }] }), { status: 200 }))
    const { GET } = await import('./route')
    const res = await GET(new Request('http://localhost/api/user/ollama-status')) as Response
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.models).toContain('llama3')
  })
})
