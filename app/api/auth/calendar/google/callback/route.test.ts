import { describe, it, expect, vi, beforeEach } from 'vitest'

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  connectGoogleCalendar: vi.fn(),
  upsertIntegrationStatus: vi.fn(),
}))

vi.mock('@/lib/auth/config', () => ({ auth: mocks.auth }))
vi.mock('@/features/calendar/server/connect', () => ({ connectGoogleCalendar: mocks.connectGoogleCalendar }))
vi.mock('@/lib/integrations/service', () => ({ upsertIntegrationStatus: mocks.upsertIntegrationStatus }))
vi.mock('@/lib/env', () => ({ env: { appUrl: 'https://ebuddy.test' } }))

describe('GET /api/auth/calendar/google/callback', () => {
  beforeEach(() => {
    vi.resetModules()
    mocks.auth.mockReset()
    mocks.connectGoogleCalendar.mockReset()
    mocks.upsertIntegrationStatus.mockReset()
    mocks.upsertIntegrationStatus.mockResolvedValue(undefined)
  })

  it('redirige a error si faltan params', async () => {
    const { GET } = await import('./route')
    const res = await GET(new Request('https://ebuddy.test/api/auth/calendar/google/callback?error=access_denied')) as Response
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toContain('calendar_error=google')
  })

  it('redirige a error si session no coincide con state', async () => {
    mocks.auth.mockResolvedValue({ user: { id: 'u1' } })
    const { GET } = await import('./route')
    const res = await GET(new Request('https://ebuddy.test/api/auth/calendar/google/callback?code=abc&state=u2')) as Response
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toContain('calendar_error=mismatch')
  })

  it('conecta y llama upsertIntegrationStatus en éxito', async () => {
    mocks.auth.mockResolvedValue({ user: { id: 'u1' } })
    mocks.connectGoogleCalendar.mockResolvedValue(undefined)
    const { GET } = await import('./route')
    const res = await GET(new Request('https://ebuddy.test/api/auth/calendar/google/callback?code=abc&state=u1')) as Response
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toContain('calendar_connected=google')
    expect(mocks.upsertIntegrationStatus).toHaveBeenCalledWith('google-calendar', 'active', expect.anything())
  })

  it('llama upsertIntegrationStatus con error si connectGoogleCalendar falla', async () => {
    mocks.auth.mockResolvedValue({ user: { id: 'u1' } })
    mocks.connectGoogleCalendar.mockRejectedValue(new Error('token exchange failed'))
    const { GET } = await import('./route')
    const res = await GET(new Request('https://ebuddy.test/api/auth/calendar/google/callback?code=abc&state=u1')) as Response
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toContain('calendar_error=google')
    expect(mocks.upsertIntegrationStatus).toHaveBeenCalledWith('google-calendar', 'error', expect.anything())
  })
})
