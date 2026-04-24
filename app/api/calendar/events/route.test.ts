import { describe, it, expect, vi, beforeEach } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireAuthenticatedUserId: vi.fn(),
  loadCalendarEvents: vi.fn(),
}))
vi.mock('@/lib/auth/request', () => ({ requireAuthenticatedUserId: mocks.requireAuthenticatedUserId }))
vi.mock('@/features/calendar/server', () => ({ loadCalendarEvents: mocks.loadCalendarEvents }))

describe('GET /api/calendar/events', () => {
  beforeEach(() => {
    vi.resetModules()
    mocks.requireAuthenticatedUserId.mockReset()
    mocks.loadCalendarEvents.mockReset()
  })

  it('retorna 401 sin autenticación', async () => {
    mocks.requireAuthenticatedUserId.mockReturnValue({ response: new Response('', { status: 401 }) })
    const { GET } = await import('./route')
    const res = await GET(new Request('http://localhost/api/calendar/events')) as Response
    expect(res.status).toBe(401)
  })

  it('retorna eventos del calendario', async () => {
    mocks.requireAuthenticatedUserId.mockReturnValue({ userId: 'u1' })
    mocks.loadCalendarEvents.mockResolvedValue({ events: [{ id: 'e1', title: 'Reunión' }] })
    const { GET } = await import('./route')
    const res = await GET(new Request('http://localhost/api/calendar/events')) as Response
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.events).toHaveLength(1)
  })

  it('retorna 500 si falla loadCalendarEvents', async () => {
    mocks.requireAuthenticatedUserId.mockReturnValue({ userId: 'u1' })
    mocks.loadCalendarEvents.mockRejectedValue(new Error('auth required'))
    const { GET } = await import('./route')
    const res = await GET(new Request('http://localhost/api/calendar/events')) as Response
    expect(res.status).toBe(500)
  })
})
