import { describe, it, expect, vi, beforeEach } from 'vitest'

const mocks = vi.hoisted(() => ({ runDueNotificationsCron: vi.fn() }))
vi.mock('@/features/notifications/server/service', () => ({ runDueNotificationsCron: mocks.runDueNotificationsCron }))

describe('POST /api/cron/due-notifications', () => {
  beforeEach(() => { vi.resetModules(); mocks.runDueNotificationsCron.mockReset() })

  it('retorna 401 sin token', async () => {
    vi.stubEnv('CRON_SECRET', 'secret123')
    const { POST } = await import('./route')
    const res = await POST(new Request('http://localhost/api/cron/due-notifications', {
      method: 'POST',
      headers: { authorization: 'Bearer wrong' },
    })) as Response
    expect(res.status).toBe(401)
    vi.unstubAllEnvs()
  })

  it('ejecuta cron con token correcto', async () => {
    vi.stubEnv('CRON_SECRET', 'secret123')
    mocks.runDueNotificationsCron.mockResolvedValue({ sent: 2 })
    const { POST } = await import('./route')
    const res = await POST(new Request('http://localhost/api/cron/due-notifications', {
      method: 'POST',
      headers: { authorization: 'Bearer secret123' },
    })) as Response
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.sent).toBe(2)
    vi.unstubAllEnvs()
  })
})
