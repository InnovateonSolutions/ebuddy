import { describe, it, expect, vi, beforeEach } from 'vitest'

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  connectMicrosoftCalendar: vi.fn(),
  upsertIntegrationStatus: vi.fn(),
}))

vi.mock('@/lib/auth/config', () => ({ auth: mocks.auth }))
vi.mock('@/features/calendar/server/connect', () => ({ connectMicrosoftCalendar: mocks.connectMicrosoftCalendar }))
vi.mock('@/lib/integrations/service', () => ({ upsertIntegrationStatus: mocks.upsertIntegrationStatus }))
vi.mock('@/lib/env', () => ({ env: { appUrl: 'https://ebuddy.test' } }))

describe('GET /api/auth/calendar/microsoft/callback', () => {
  beforeEach(() => {
    vi.resetModules()
    mocks.auth.mockReset()
    mocks.connectMicrosoftCalendar.mockReset()
    mocks.upsertIntegrationStatus.mockReset()
    mocks.upsertIntegrationStatus.mockResolvedValue(undefined)
  })

  it('redirige a error si faltan params', async () => {
    const { GET } = await import('./route')
    const res = await GET(new Request('https://ebuddy.test/api/auth/calendar/microsoft/callback?error=access_denied')) as Response
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toContain('calendar_error=microsoft')
  })

  it('conecta y llama upsertIntegrationStatus en éxito', async () => {
    mocks.auth.mockResolvedValue({ user: { id: 'u1' } })
    mocks.connectMicrosoftCalendar.mockResolvedValue(undefined)
    const { GET } = await import('./route')
    const res = await GET(new Request('https://ebuddy.test/api/auth/calendar/microsoft/callback?code=abc&state=u1')) as Response
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toContain('calendar_connected=microsoft')
    expect(mocks.upsertIntegrationStatus).toHaveBeenCalledWith('microsoft-calendar', 'active', expect.anything())
  })

  it('llama upsertIntegrationStatus con error si connectMicrosoftCalendar falla', async () => {
    mocks.auth.mockResolvedValue({ user: { id: 'u1' } })
    mocks.connectMicrosoftCalendar.mockRejectedValue(new Error('auth failed'))
    const { GET } = await import('./route')
    const res = await GET(new Request('https://ebuddy.test/api/auth/calendar/microsoft/callback?code=abc&state=u1')) as Response
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toContain('calendar_error=microsoft')
    expect(mocks.upsertIntegrationStatus).toHaveBeenCalledWith('microsoft-calendar', 'error', expect.anything())
  })
})
