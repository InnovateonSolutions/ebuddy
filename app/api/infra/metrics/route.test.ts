import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireAuthenticatedUserId: vi.fn(),
  getInfraSnapshot: vi.fn(),
}))

vi.mock('@/lib/auth/request', () => ({ requireAuthenticatedUserId: mocks.requireAuthenticatedUserId }))
vi.mock('@/features/infra/server/service', () => ({ getInfraSnapshot: mocks.getInfraSnapshot }))

describe('GET /api/infra/metrics', () => {
  beforeEach(() => {
    mocks.requireAuthenticatedUserId.mockReset()
    mocks.getInfraSnapshot.mockReset()
  })

  it('retorna 401 si no hay sesión', async () => {
    mocks.requireAuthenticatedUserId.mockReturnValue({
      response: Response.json({ success: false, code: 'UNAUTHORIZED' }, { status: 401 }),
    })

    const { GET } = await import('./route')
    const res = await GET(new Request('http://localhost/api/infra/metrics')) as Response

    expect(res.status).toBe(401)
  })

  it('retorna el snapshot unificado para la página de Infra', async () => {
    mocks.requireAuthenticatedUserId.mockReturnValue({ userId: 'owner-1' })
    mocks.getInfraSnapshot.mockResolvedValue({
      droplet: {
        available: true,
        source: 'digitalocean',
        cpu: 21.5,
        ram: { pct: 52.2, used: 2_100_000_000, total: 4_000_000_000 },
        disk: { pct: 61.4, used: 48_000_000_000, total: 80_000_000_000 },
      },
      diagnostics: {
        configured: true,
        available: true,
        source: 'prometheus',
        targets: {
          droplet: { available: true, label: 'Droplet DO' },
          elitemini: { available: false, label: 'elitemini' },
        },
      },
      services: {
        source: 'elitemini',
        openclaw: {
          configured: true,
          available: true,
          baseUrl: 'http://100.80.59.3:18789',
          version: '2026.4.15',
        },
        ollama: {
          configured: true,
          available: true,
          baseUrl: 'http://100.80.59.3:11434',
          version: '0.8.0',
          models: ['llama3:latest'],
        },
      },
      app: {
        source: 'application',
        health: 'ok',
        db: 'ok',
        activeTickets: 12,
        createdLast24h: 3,
        completedLast7d: 8,
        connectedCalendars: 2,
        lastCaptureAt: '2026-04-19T21:00:00.000Z',
      },
      ts: '2026-04-19T21:01:00.000Z',
    })

    const { GET } = await import('./route')
    const res = await GET(new Request('http://localhost/api/infra/metrics')) as Response
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(mocks.getInfraSnapshot).toHaveBeenCalledWith('owner-1')
    expect(body.data.droplet.source).toBe('digitalocean')
    expect(body.data.diagnostics.source).toBe('prometheus')
    expect(body.data.services.source).toBe('elitemini')
    expect(body.data.app.source).toBe('application')
  })
})
