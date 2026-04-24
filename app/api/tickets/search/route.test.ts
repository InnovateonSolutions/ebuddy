import { describe, it, expect, vi, beforeEach } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireAuthenticatedUserId: vi.fn(),
  searchTickets: vi.fn(),
}))

vi.mock('@/lib/auth/request', () => ({ requireAuthenticatedUserId: mocks.requireAuthenticatedUserId }))
vi.mock('@/features/tickets/server/queries', () => ({ searchTickets: mocks.searchTickets }))

describe('GET /api/tickets/search', () => {
  beforeEach(() => { vi.resetModules(); mocks.requireAuthenticatedUserId.mockReset(); mocks.searchTickets.mockReset() })

  it('retorna 401 sin autenticación', async () => {
    mocks.requireAuthenticatedUserId.mockReturnValue({ response: new Response('', { status: 401 }) })
    const { GET } = await import('./route')
    const res = await GET(new Request('http://localhost/api/tickets/search?q=test')) as Response
    expect(res.status).toBe(401)
  })

  it('retorna lista vacía para query menor a 2 chars', async () => {
    mocks.requireAuthenticatedUserId.mockReturnValue({ userId: 'u1' })
    const { GET } = await import('./route')
    const res = await GET(new Request('http://localhost/api/tickets/search?q=a')) as Response
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toEqual([])
    expect(mocks.searchTickets).not.toHaveBeenCalled()
  })

  it('retorna resultados de búsqueda', async () => {
    mocks.requireAuthenticatedUserId.mockReturnValue({ userId: 'u1' })
    mocks.searchTickets.mockResolvedValue([{ id: 't1', title: 'Reunión cliente' }])
    const { GET } = await import('./route')
    const res = await GET(new Request('http://localhost/api/tickets/search?q=reun')) as Response
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toHaveLength(1)
  })
})
