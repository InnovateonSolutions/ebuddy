import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const realEnv = { ...process.env }

function metric(value: string, metricLabels: Record<string, string> = {}) {
  return {
    status: 'success',
    data: {
      resultType: 'matrix',
      result: [
        {
          metric: metricLabels,
          values: [[Date.now() / 1000, value]],
        },
      ],
    },
  }
}

describe('getDigitalOceanDropletMetrics', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.restoreAllMocks()
    process.env = { ...realEnv }
    delete process.env.DO_MONITORING_TOKEN
    delete process.env.DO_DROPLET_ID
  })

  afterEach(() => {
    process.env = { ...realEnv }
  })

  it('explica cuando falta el token de monitoring', async () => {
    const { getDigitalOceanDropletMetrics } = await import('./do-metrics')

    const metrics = await getDigitalOceanDropletMetrics()

    expect(metrics.available).toBe(false)
    expect(metrics.reason).toContain('DO_MONITORING_TOKEN')
  })

  it('explica cuando no puede resolver el droplet id', async () => {
    process.env.DO_MONITORING_TOKEN = 'token'

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('metadata offline')))

    const { getDigitalOceanDropletMetrics } = await import('./do-metrics')
    const metrics = await getDigitalOceanDropletMetrics()

    expect(metrics.available).toBe(false)
    expect(metrics.reason).toContain('DO_DROPLET_ID')
  })

  it('usa el droplet id del runtime y devuelve métricas de DO', async () => {
    process.env.DO_MONITORING_TOKEN = 'token'
    process.env.DO_DROPLET_ID = '123456'

    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => metric('18.4') })
      .mockResolvedValueOnce({ ok: true, json: async () => metric('2500000000') })
      .mockResolvedValueOnce({ ok: true, json: async () => metric('4000000000') })
      .mockResolvedValueOnce({ ok: true, json: async () => metric('34000000000', { mountpoint: '/' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => metric('80000000000', { mountpoint: '/' }) })

    vi.stubGlobal('fetch', fetchMock)

    const { getDigitalOceanDropletMetrics } = await import('./do-metrics')
    const metrics = await getDigitalOceanDropletMetrics()

    expect(metrics.available).toBe(true)
    expect(metrics.hostId).toBe('123456')
    expect(metrics.cpu).toBe(18.4)
    expect(metrics.ram?.pct).toBe(37.5)
    expect(metrics.disk?.pct).toBe(57.5)
    expect(fetchMock).toHaveBeenCalledTimes(5)
  })

  it('calcula CPU como porcentaje total a partir de series acumuladas por mode', async () => {
    process.env.DO_MONITORING_TOKEN = 'token'
    process.env.DO_DROPLET_ID = '123456'

    const cpuMetric = {
      status: 'success',
      data: {
        resultType: 'matrix',
        result: [
          {
            metric: { mode: 'idle' },
            values: [[1, '100'], [2, '110']],
          },
          {
            metric: { mode: 'user' },
            values: [[1, '30'], [2, '50']],
          },
          {
            metric: { mode: 'system' },
            values: [[1, '20'], [2, '30']],
          },
        ],
      },
    }

    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => cpuMetric })
      .mockResolvedValueOnce({ ok: true, json: async () => metric('2500000000') })
      .mockResolvedValueOnce({ ok: true, json: async () => metric('4000000000') })
      .mockResolvedValueOnce({ ok: true, json: async () => metric('34000000000', { mountpoint: '/' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => metric('80000000000', { mountpoint: '/' }) })

    vi.stubGlobal('fetch', fetchMock)

    const { getDigitalOceanDropletMetrics } = await import('./do-metrics')
    const metrics = await getDigitalOceanDropletMetrics()

    expect(metrics.available).toBe(true)
    expect(metrics.cpu).toBe(75)
  })
})
