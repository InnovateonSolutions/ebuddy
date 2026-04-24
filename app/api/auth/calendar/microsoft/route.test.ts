import { describe, it, expect, vi, beforeEach } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireAuthenticatedUserId: vi.fn(),
  getMicrosoftAuthUrl: vi.fn(),
}))

vi.mock('@/lib/auth/request', () => ({ requireAuthenticatedUserId: mocks.requireAuthenticatedUserId }))
vi.mock('@/features/calendar/server/microsoft', () => ({ getMicrosoftAuthUrl: mocks.getMicrosoftAuthUrl }))

describe('GET /api/auth/calendar/microsoft', () => {
  beforeEach(() => { vi.resetModules(); mocks.requireAuthenticatedUserId.mockReset(); mocks.getMicrosoftAuthUrl.mockReset() })

  it('retorna 401 sin autenticación', async () => {
    mocks.requireAuthenticatedUserId.mockReturnValue({ response: new Response('', { status: 401 }) })
    const { GET } = await import('./route')
    const res = await GET(new Request('http://localhost/api/auth/calendar/microsoft')) as Response
    expect(res.status).toBe(401)
  })

  it('redirige a la URL de autorización de Microsoft', async () => {
    mocks.requireAuthenticatedUserId.mockReturnValue({ userId: 'u1' })
    mocks.getMicrosoftAuthUrl.mockReturnValue('https://login.microsoftonline.com/...')
    const { GET } = await import('./route')
    const res = await GET(new Request('http://localhost/api/auth/calendar/microsoft')) as Response
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toContain('microsoftonline.com')
  })
})
