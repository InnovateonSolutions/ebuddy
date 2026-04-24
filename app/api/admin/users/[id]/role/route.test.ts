import { describe, it, expect, vi, beforeEach } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireCapability: vi.fn(),
  requireStepUp: vi.fn(),
  dbUpdate: vi.fn(),
  dbSet: vi.fn(),
  dbWhere: vi.fn(),
}))

vi.mock('@/lib/auth/permissions', () => ({
  requireCapability: mocks.requireCapability,
  requireStepUp: mocks.requireStepUp,
}))
vi.mock('@/lib/db', () => ({ db: { update: mocks.dbUpdate } }))
vi.mock('@/lib/db/schema', () => ({ users: { id: 'id', role: 'role' } }))
vi.mock('drizzle-orm', () => ({ eq: vi.fn() }))

describe('PATCH /api/admin/users/[id]/role', () => {
  beforeEach(() => {
    mocks.requireCapability.mockReset()
    mocks.requireStepUp.mockReset()
    mocks.dbUpdate.mockReset()
    mocks.dbUpdate.mockReturnValue({ set: mocks.dbSet })
    mocks.dbSet.mockReturnValue({ where: mocks.dbWhere })
    mocks.dbWhere.mockResolvedValue(undefined)
  })

  it('retorna 403 si no tiene users.manage', async () => {
    mocks.requireCapability.mockResolvedValue({ response: new Response('', { status: 403 }) })
    const { PATCH } = await import('./route')
    const res = await PATCH(
      new Request('http://localhost/api/admin/users/u2/role', { method: 'PATCH', body: JSON.stringify({ role: 'MEMBER' }) }),
      { params: Promise.resolve({ id: 'u2' }) }
    ) as Response
    expect(res.status).toBe(403)
  })

  it('retorna 403 si step-up falla', async () => {
    mocks.requireCapability.mockResolvedValue({ userId: 'u1', role: 'OWNER', capabilities: ['users.manage'] })
    mocks.requireStepUp.mockResolvedValue({ response: new Response('', { status: 403 }) })
    const { PATCH } = await import('./route')
    const res = await PATCH(
      new Request('http://localhost/api/admin/users/u2/role', { method: 'PATCH', body: JSON.stringify({ role: 'MEMBER' }) }),
      { params: Promise.resolve({ id: 'u2' }) }
    ) as Response
    expect(res.status).toBe(403)
  })

  it('actualiza el rol cuando capability y step-up pasan', async () => {
    mocks.requireCapability.mockResolvedValue({ userId: 'u1', role: 'OWNER', capabilities: ['users.manage'] })
    mocks.requireStepUp.mockResolvedValue({ userId: 'u1' })
    const { PATCH } = await import('./route')
    const res = await PATCH(
      new Request('http://localhost/api/admin/users/u2/role', { method: 'PATCH', body: JSON.stringify({ role: 'MEMBER' }) }),
      { params: Promise.resolve({ id: 'u2' }) }
    ) as Response
    expect(res.status).toBe(200)
    expect(mocks.dbUpdate).toHaveBeenCalled()
  })

  it('rechaza rol inválido', async () => {
    mocks.requireCapability.mockResolvedValue({ userId: 'u1', role: 'OWNER', capabilities: ['users.manage'] })
    mocks.requireStepUp.mockResolvedValue({ userId: 'u1' })
    const { PATCH } = await import('./route')
    const res = await PATCH(
      new Request('http://localhost/api/admin/users/u2/role', { method: 'PATCH', body: JSON.stringify({ role: 'SUPERADMIN' }) }),
      { params: Promise.resolve({ id: 'u2' }) }
    ) as Response
    expect(res.status).toBe(400)
  })
})
