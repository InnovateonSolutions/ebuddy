import { describe, it, expect, vi, beforeEach } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireAuthenticatedUserId: vi.fn(),
  getGoogleAuthUrl: vi.fn(),
}))

vi.mock('@/lib/auth/request', () => ({ requireAuthenticatedUserId: mocks.requireAuthenticatedUserId }))
vi.mock('@/features/calendar/server/google', () => ({ getGoogleAuthUrl: mocks.getGoogleAuthUrl }))

describe('GET /api/auth/calendar/google', () => {
  beforeEach(() => { vi.resetModules(); mocks.requireAuthenticatedUserId.mockReset(); mocks.getGoogleAuthUrl.mockReset() })

  it('retorna 401 sin autenticación', async () => {
    mocks.requireAuthenticatedUserId.mockReturnValue({ response: new Response('', { status: 401 }) })
    const { GET } = await import('./route')
    const res = await GET(new Request('http://localhost/api/auth/calendar/google')) as Response
    expect(res.status).toBe(401)
  })

  it('redirige a la URL de autorización de Google', async () => {
    mocks.requireAuthenticatedUserId.mockReturnValue({ userId: 'u1' })
    mocks.getGoogleAuthUrl.mockReturnValue('https://accounts.google.com/o/oauth2/auth?...')
    const { GET } = await import('./route')
    const res = await GET(new Request('http://localhost/api/auth/calendar/google')) as Response
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toContain('accounts.google.com')
  })
})
