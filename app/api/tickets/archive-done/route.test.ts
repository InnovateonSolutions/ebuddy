import { describe, it, expect, vi, beforeEach } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireAuthenticatedUserId: vi.fn(),
  dbUpdate: vi.fn(),
  dbSet: vi.fn(),
  dbWhere: vi.fn(),
  dbReturning: vi.fn(),
}))

vi.mock('@/lib/auth/request', () => ({ requireAuthenticatedUserId: mocks.requireAuthenticatedUserId }))
vi.mock('@/lib/db', () => ({ db: { update: mocks.dbUpdate } }))
vi.mock('@/lib/db/schema', () => ({ tickets: { userId: 'userId', status: 'status', updatedAt: 'updatedAt', archived: 'archived' } }))
vi.mock('drizzle-orm', () => ({ and: vi.fn(), eq: vi.fn(), lt: vi.fn() }))

describe('POST /api/tickets/archive-done', () => {
  beforeEach(() => {
    vi.resetModules()
    mocks.requireAuthenticatedUserId.mockReset()
    mocks.dbUpdate.mockReset()
    mocks.dbUpdate.mockReturnValue({ set: mocks.dbSet })
    mocks.dbSet.mockReturnValue({ where: mocks.dbWhere })
    mocks.dbWhere.mockReturnValue({ returning: mocks.dbReturning })
  })

  it('retorna 401 sin autenticación', async () => {
    mocks.requireAuthenticatedUserId.mockReturnValue({ response: new Response('', { status: 401 }) })
    const { POST } = await import('./route')
    const res = await POST(new Request('http://localhost/api/tickets/archive-done', { method: 'POST' })) as Response
    expect(res.status).toBe(401)
  })

  it('archiva tickets y retorna conteo', async () => {
    mocks.requireAuthenticatedUserId.mockReturnValue({ userId: 'u1' })
    mocks.dbReturning.mockResolvedValue([{ id: 't1' }, { id: 't2' }])
    const { POST } = await import('./route')
    const res = await POST(new Request('http://localhost/api/tickets/archive-done', { method: 'POST' })) as Response
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.archived).toBe(2)
  })
})
