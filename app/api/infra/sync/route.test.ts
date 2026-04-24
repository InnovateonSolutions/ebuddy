import { describe, it, expect, vi, beforeEach } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireCapability: vi.fn(),
  getEliteminiServices: vi.fn(),
  upsertIntegrationStatus: vi.fn(),
}))

vi.mock('@/lib/auth/permissions', () => ({ requireCapability: mocks.requireCapability }))
vi.mock('@/features/infra/server/elitemini-services', () => ({ getEliteminiServices: mocks.getEliteminiServices }))
vi.mock('@/lib/integrations/service', () => ({ upsertIntegrationStatus: mocks.upsertIntegrationStatus }))

describe('POST /api/infra/sync', () => {
  beforeEach(() => {
    mocks.requireCapability.mockReset()
    mocks.getEliteminiServices.mockReset()
    mocks.upsertIntegrationStatus.mockReset()
    mocks.upsertIntegrationStatus.mockResolvedValue(undefined)
  })

  it('retorna 403 si no tiene infra.write', async () => {
    mocks.requireCapability.mockResolvedValue({ response: new Response('', { status: 403 }) })
    const { POST } = await import('./route')
    const res = await POST(new Request('http://localhost/api/infra/sync', { method: 'POST' })) as Response
    expect(res.status).toBe(403)
  })

  it('llama upsertIntegrationStatus para cada spoke y retorna resumen', async () => {
    mocks.requireCapability.mockResolvedValue({ userId: 'u1', role: 'OWNER', capabilities: ['infra.write'] })
    mocks.getEliteminiServices.mockResolvedValue({
      openclaw: { configured: true, available: true },
      ollama: { configured: true, available: false, reason: 'timeout' },
    })

    const { POST } = await import('./route')
    const res = await POST(new Request('http://localhost/api/infra/sync', { method: 'POST' })) as Response

    expect(res.status).toBe(200)
    expect(mocks.upsertIntegrationStatus).toHaveBeenCalledWith('openclaw', 'active', expect.anything())
    expect(mocks.upsertIntegrationStatus).toHaveBeenCalledWith('ollama', 'error', expect.anything())
  })
})
