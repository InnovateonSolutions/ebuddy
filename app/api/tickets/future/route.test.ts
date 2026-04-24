import { describe, it, expect, vi, beforeEach } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireAuthenticatedUserId: vi.fn(),
  getFutureTicketsPage: vi.fn(),
  InvalidFutureCursorError: class extends Error {},
}))

vi.mock('@/lib/auth/request', () => ({ requireAuthenticatedUserId: mocks.requireAuthenticatedUserId }))
vi.mock('@/features/tickets/server/queries', () => ({
  getFutureTicketsPage: mocks.getFutureTicketsPage,
  InvalidFutureCursorError: mocks.InvalidFutureCursorError,
}))

describe('GET /api/tickets/future', () => {
  beforeEach(() => { vi.resetModules(); mocks.requireAuthenticatedUserId.mockReset(); mocks.getFutureTicketsPage.mockReset() })

  it('retorna 401 sin autenticación', async () => {
    mocks.requireAuthenticatedUserId.mockReturnValue({ response: new Response('', { status: 401 }) })
    const { GET } = await import('./route')
    const res = await GET(new Request('http://localhost/api/tickets/future')) as Response
    expect(res.status).toBe(401)
  })

  it('retorna tickets futuros', async () => {
    mocks.requireAuthenticatedUserId.mockReturnValue({ userId: 'u1' })
    mocks.getFutureTicketsPage.mockResolvedValue({ items: [], nextCursor: null })
    const { GET } = await import('./route')
    const res = await GET(new Request('http://localhost/api/tickets/future')) as Response
    expect(res.status).toBe(200)
  })

  it('retorna 400 con cursor inválido', async () => {
    mocks.requireAuthenticatedUserId.mockReturnValue({ userId: 'u1' })
    mocks.getFutureTicketsPage.mockRejectedValue(new mocks.InvalidFutureCursorError('bad'))
    const { GET } = await import('./route')
    const res = await GET(new Request('http://localhost/api/tickets/future?cursor=bad')) as Response
    expect(res.status).toBe(400)
  })
})
