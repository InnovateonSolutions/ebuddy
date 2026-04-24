import { describe, it, expect, vi, beforeEach } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireAuthenticatedUserId: vi.fn(),
  getTodayViewData: vi.fn(),
  loadCalendarEvents: vi.fn(),
}))

vi.mock('@/lib/auth/request', () => ({ requireAuthenticatedUserId: mocks.requireAuthenticatedUserId }))
vi.mock('@/features/tickets/server/queries', () => ({ getTodayViewData: mocks.getTodayViewData }))
vi.mock('@/features/calendar/server', () => ({ loadCalendarEvents: mocks.loadCalendarEvents }))

describe('GET /api/tickets/today', () => {
  beforeEach(() => {
    vi.resetModules()
    mocks.requireAuthenticatedUserId.mockReset()
    mocks.getTodayViewData.mockReset()
    mocks.loadCalendarEvents.mockReset()
  })

  it('retorna 401 sin autenticación', async () => {
    mocks.requireAuthenticatedUserId.mockReturnValue({ response: new Response('', { status: 401 }) })
    const { GET } = await import('./route')
    const res = await GET(new Request('http://localhost/api/tickets/today')) as Response
    expect(res.status).toBe(401)
  })

  it('retorna datos combinados de tickets y calendario', async () => {
    mocks.requireAuthenticatedUserId.mockReturnValue({ userId: 'u1' })
    mocks.getTodayViewData.mockResolvedValue({ data: { tickets: [], total: 0 } })
    mocks.loadCalendarEvents.mockResolvedValue({ events: [{ id: 'e1' }] })
    const { GET } = await import('./route')
    const res = await GET(new Request('http://localhost/api/tickets/today')) as Response
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.calendar_events).toHaveLength(1)
  })

  it('retorna 500 si falla la query', async () => {
    mocks.requireAuthenticatedUserId.mockReturnValue({ userId: 'u1' })
    mocks.getTodayViewData.mockRejectedValue(new Error('db error'))
    mocks.loadCalendarEvents.mockResolvedValue({ events: [] })
    const { GET } = await import('./route')
    const res = await GET(new Request('http://localhost/api/tickets/today')) as Response
    expect(res.status).toBe(500)
  })
})
