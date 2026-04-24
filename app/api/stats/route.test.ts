import { describe, it, expect, vi, beforeEach } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireAuthenticatedUserId: vi.fn(),
  getUserTimezone: vi.fn(),
  getTicketStats: vi.fn(),
}))

vi.mock('@/lib/auth/request', () => ({ requireAuthenticatedUserId: mocks.requireAuthenticatedUserId }))
vi.mock('@/features/tickets/server/queries', () => ({ getUserTimezone: mocks.getUserTimezone }))
vi.mock('@/features/tickets/server/stats', () => ({ getTicketStats: mocks.getTicketStats }))

describe('GET /api/stats', () => {
  beforeEach(() => {
    vi.resetModules()
    mocks.requireAuthenticatedUserId.mockReset()
    mocks.getUserTimezone.mockReset()
    mocks.getTicketStats.mockReset()
  })

  it('retorna 401 si no autenticado', async () => {
    mocks.requireAuthenticatedUserId.mockReturnValue({ response: new Response('', { status: 401 }) })
    const { GET } = await import('./route')
    const res = await GET(new Request('http://localhost/api/stats')) as Response
    expect(res.status).toBe(401)
  })

  it('retorna stats del usuario', async () => {
    mocks.requireAuthenticatedUserId.mockReturnValue({ userId: 'u1' })
    mocks.getUserTimezone.mockResolvedValue('America/Tijuana')
    mocks.getTicketStats.mockResolvedValue({ total: 5, done: 2 })
    const { GET } = await import('./route')
    const res = await GET(new Request('http://localhost/api/stats')) as Response
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.total).toBe(5)
  })
})
