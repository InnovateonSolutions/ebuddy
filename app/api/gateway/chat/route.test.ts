import { describe, it, expect, vi, beforeEach } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireCapability: vi.fn(),
  fetch: vi.fn(),
  env: { openclawBaseUrl: 'http://100.64.0.5:4000', openclawGatewayToken: 'tok' },
  addObsidianContextToChatBody: vi.fn(),
}))

vi.mock('@/lib/auth/permissions', () => ({ requireCapability: mocks.requireCapability }))
vi.mock('@/lib/env', () => ({ env: mocks.env }))
vi.mock('@/lib/campaign/obsidian', () => ({ addObsidianContextToChatBody: mocks.addObsidianContextToChatBody }))
vi.stubGlobal('fetch', mocks.fetch)

describe('POST /api/gateway/chat', () => {
  beforeEach(() => {
    mocks.requireCapability.mockReset()
    mocks.fetch.mockReset()
    mocks.addObsidianContextToChatBody.mockReset()
    mocks.addObsidianContextToChatBody.mockImplementation(async (body: unknown) => body)
  })

  it('retorna 403 si no tiene gateway.execute', async () => {
    mocks.requireCapability.mockResolvedValue({ response: new Response('', { status: 403 }) })
    const { POST } = await import('./route')
    const res = await POST(new Request('http://localhost/api/gateway/chat', { method: 'POST', body: '{}' })) as Response
    expect(res.status).toBe(403)
  })

  it('proxea la petición a OpenClaw y retorna la respuesta', async () => {
    mocks.requireCapability.mockResolvedValue({ userId: 'u1', role: 'OWNER', capabilities: ['gateway.execute'] })
    mocks.fetch.mockResolvedValue(new Response(JSON.stringify({ choices: [] }), { status: 200 }))

    const { POST } = await import('./route')
    const res = await POST(new Request('http://localhost/api/gateway/chat', {
      method: 'POST',
      body: JSON.stringify({ model: 'llama3', messages: [{ role: 'user', content: 'hola' }] }),
    })) as Response

    expect(res.status).toBe(200)
    expect(mocks.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/v1/chat/completions'),
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('inyecta contexto de Obsidian antes de proxyear a OpenClaw', async () => {
    mocks.requireCapability.mockResolvedValue({ userId: 'u1', role: 'OWNER', capabilities: ['gateway.execute'] })
    mocks.addObsidianContextToChatBody.mockResolvedValue({
      model: 'llama3',
      messages: [
        { role: 'system', content: 'Contexto de Obsidian para Dungeon Master' },
        { role: 'user', content: 'Que sabe Hilda?' },
      ],
    })
    mocks.fetch.mockResolvedValue(new Response(JSON.stringify({ choices: [] }), { status: 200 }))

    const { POST } = await import('./route')
    await POST(new Request('http://localhost/api/gateway/chat', {
      method: 'POST',
      body: JSON.stringify({ model: 'llama3', messages: [{ role: 'user', content: 'Que sabe Hilda?' }] }),
    })) as Response

    expect(mocks.addObsidianContextToChatBody).toHaveBeenCalledWith({
      model: 'llama3',
      messages: [{ role: 'user', content: 'Que sabe Hilda?' }],
    })
    expect(mocks.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({
          model: 'llama3',
          messages: [
            { role: 'system', content: 'Contexto de Obsidian para Dungeon Master' },
            { role: 'user', content: 'Que sabe Hilda?' },
          ],
        }),
      })
    )
  })

  it('retorna 503 si OpenClaw no está configurado', async () => {
    mocks.requireCapability.mockResolvedValue({ userId: 'u1', role: 'OWNER', capabilities: ['gateway.execute'] })
    mocks.env.openclawBaseUrl = ''

    const { POST } = await import('./route')
    const res = await POST(new Request('http://localhost/api/gateway/chat', { method: 'POST', body: '{}' })) as Response
    expect(res.status).toBe(503)
    mocks.env.openclawBaseUrl = 'http://100.64.0.5:4000'
  })
})
