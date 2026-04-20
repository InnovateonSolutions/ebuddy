import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getDigitalOceanDropletMetrics: vi.fn(),
  getPrometheusDiagnostics: vi.fn(),
  getApplicationMetrics: vi.fn(),
}))

vi.mock('@/features/infra/server/do-metrics', () => ({
  getDigitalOceanDropletMetrics: mocks.getDigitalOceanDropletMetrics,
}))

vi.mock('@/features/infra/server/prometheus-metrics', () => ({
  getPrometheusDiagnostics: mocks.getPrometheusDiagnostics,
}))

vi.mock('@/features/infra/server/app-metrics', () => ({
  getApplicationMetrics: mocks.getApplicationMetrics,
}))

describe('getInfraSnapshot', () => {
  beforeEach(() => {
    mocks.getDigitalOceanDropletMetrics.mockReset()
    mocks.getPrometheusDiagnostics.mockReset()
    mocks.getApplicationMetrics.mockReset()
  })

  it('combina las métricas del droplet, diagnóstico técnico y app', async () => {
    mocks.getDigitalOceanDropletMetrics.mockResolvedValue({
      available: true,
      source: 'digitalocean',
      cpu: 18.4,
      ram: { pct: 44.1, used: 1_700_000_000, total: 4_000_000_000 },
      disk: { pct: 58.2, used: 46_000_000_000, total: 80_000_000_000 },
    })
    mocks.getPrometheusDiagnostics.mockResolvedValue({
      available: true,
      source: 'prometheus',
      targets: {
        droplet: { available: true, label: 'Droplet DO' },
        elitemini: { available: true, label: 'elitemini' },
      },
    })
    mocks.getApplicationMetrics.mockResolvedValue({
      source: 'application',
      health: 'ok',
      activeTickets: 7,
      createdLast24h: 2,
      completedLast7d: 5,
      lastCaptureAt: '2026-04-19T20:00:00.000Z',
    })

    const { getInfraSnapshot } = await import('./service')
    const snapshot = await getInfraSnapshot('user-1')

    expect(mocks.getApplicationMetrics).toHaveBeenCalledWith('user-1')
    expect(snapshot.droplet.source).toBe('digitalocean')
    expect(snapshot.diagnostics.source).toBe('prometheus')
    expect(snapshot.app.source).toBe('application')
    expect(typeof snapshot.ts).toBe('string')
  })

  it('degrada solo el bloque del droplet cuando DO falla', async () => {
    mocks.getDigitalOceanDropletMetrics.mockRejectedValue(new Error('do unavailable'))
    mocks.getPrometheusDiagnostics.mockResolvedValue({
      available: true,
      source: 'prometheus',
      targets: {
        droplet: { available: true, label: 'Droplet DO' },
        elitemini: { available: false, label: 'elitemini' },
      },
    })
    mocks.getApplicationMetrics.mockResolvedValue({
      source: 'application',
      health: 'degraded',
      activeTickets: 0,
      createdLast24h: 0,
      completedLast7d: 0,
      lastCaptureAt: null,
    })

    const { getInfraSnapshot } = await import('./service')
    const snapshot = await getInfraSnapshot('user-2')

    expect(snapshot.droplet.available).toBe(false)
    expect(snapshot.diagnostics.available).toBe(true)
    expect(snapshot.app.health).toBe('degraded')
  })
})
