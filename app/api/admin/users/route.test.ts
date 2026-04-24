import { describe, it, expect, vi, beforeEach } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireCapability: vi.fn(),
  dbSelect: vi.fn(),
  dbFrom: vi.fn(),
  dbOrderBy: vi.fn(),
}))

vi.mock('@/lib/auth/permissions', () => ({ requireCapability: mocks.requireCapability }))
vi.mock('@/lib/db', () => ({ db: { select: mocks.dbSelect } }))
vi.mock('@/lib/db/schema', () => ({ users: { id: 'id', email: 'email', role: 'role', createdAt: 'createdAt' } }))
vi.mock('drizzle-orm', () => ({ asc: vi.fn((x: unknown) => x), desc: vi.fn((x: unknown) => x) }))

describe('GET /api/admin/users', () => {
  beforeEach(() => {
    mocks.requireCapability.mockReset()
    mocks.dbSelect.mockReset()
    mocks.dbSelect.mockReturnValue({ from: mocks.dbFrom })
    mocks.dbFrom.mockReturnValue({ orderBy: mocks.dbOrderBy })
  })

  it('retorna 403 si no tiene users.manage', async () => {
    mocks.requireCapability.mockResolvedValue({ response: new Response('', { status: 403 }) })
    const { GET } = await import('./route')
    const res = await GET(new Request('http://localhost/api/admin/users')) as Response
    expect(res.status).toBe(403)
  })

  it('retorna lista de usuarios', async () => {
    mocks.requireCapability.mockResolvedValue({ userId: 'u1', role: 'OWNER', capabilities: ['users.manage'] })
    mocks.dbOrderBy.mockResolvedValue([
      { id: 'u1', email: 'owner@e.com', role: 'OWNER', createdAt: new Date() },
    ])

    const { GET } = await import('./route')
    const res = await GET(new Request('http://localhost/api/admin/users')) as Response
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toHaveLength(1)
    expect(body.data[0].role).toBe('OWNER')
  })
})
