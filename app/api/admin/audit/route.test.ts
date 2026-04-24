import { describe, it, expect, vi, beforeEach } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireCapability: vi.fn(),
  dbSelect: vi.fn(),
  dbFrom: vi.fn(),
  dbOrderBy: vi.fn(),
  dbLimit: vi.fn(),
}))

vi.mock('@/lib/auth/permissions', () => ({ requireCapability: mocks.requireCapability }))
vi.mock('@/lib/db', () => ({ db: { select: mocks.dbSelect } }))
vi.mock('@/lib/db/schema', () => ({ privilegedAccessAudit: {} }))
vi.mock('drizzle-orm', () => ({ desc: vi.fn((x: unknown) => x) }))

describe('GET /api/admin/audit', () => {
  beforeEach(() => {
    mocks.requireCapability.mockReset()
    mocks.dbSelect.mockReset()
    mocks.dbSelect.mockReturnValue({ from: mocks.dbFrom })
    mocks.dbFrom.mockReturnValue({ orderBy: mocks.dbOrderBy })
    mocks.dbOrderBy.mockReturnValue({ limit: mocks.dbLimit })
  })

  it('retorna 403 si no tiene infra.read', async () => {
    mocks.requireCapability.mockResolvedValue({ response: new Response('', { status: 403 }) })
    const { GET } = await import('./route')
    const res = await GET(new Request('http://localhost/api/admin/audit')) as Response
    expect(res.status).toBe(403)
  })

  it('retorna las últimas entradas del audit log', async () => {
    mocks.requireCapability.mockResolvedValue({ userId: 'u1', role: 'OWNER', capabilities: ['infra.read'] })
    mocks.dbLimit.mockResolvedValue([
      { id: 'a1', capability: 'costs.read', action: 'route.access', resource: '/api/costs', outcome: 'allowed', createdAt: new Date() },
    ])

    const { GET } = await import('./route')
    const res = await GET(new Request('http://localhost/api/admin/audit')) as Response
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toHaveLength(1)
    expect(body.data[0].capability).toBe('costs.read')
  })
})
