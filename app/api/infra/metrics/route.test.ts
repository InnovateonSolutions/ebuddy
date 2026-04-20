import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  fetch: vi.fn(),
}))

vi.mock('@/lib/auth/config', () => ({ auth: mocks.auth }))
vi.stubGlobal('fetch', mocks.fetch)

function prometheusResponse(value: string) {
  return {
    ok: true,
    json: async () => ({
      status: 'success',
      data: {
        result: [
          { metric: { instance: 'localhost:9100' }, value: [Date.now() / 1000, value] },
          { metric: { instance: '100.80.59.3:9100' }, value: [Date.now() / 1000, value] },
        ],
      },
    }),
  }
}

describe('GET /api/infra/metrics', () => {
  beforeEach(() => {
    mocks.auth.mockReset()
    mocks.fetch.mockReset()
    process.env.PROMETHEUS_URL = 'http://localhost:9090'
  })

  it('retorna 401 si no hay sesión', async () => {
    mocks.auth.mockResolvedValue(null)
    const { GET } = await import('./route')
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('retorna métricas del droplet y elitemini cuando Prometheus responde', async () => {
    mocks.auth.mockResolvedValue({ user: { id: 'user-1' } })
    mocks.fetch.mockResolvedValue(prometheusResponse('42.5'))

    const { GET } = await import('./route')
    const res = await GET()
    const body = await res.json()

    expect(body.data).toHaveProperty('droplet')
    expect(body.data).toHaveProperty('elitemini')
    expect(body.data.droplet).toHaveProperty('cpu')
    expect(body.data.droplet).toHaveProperty('ram')
    expect(body.data.droplet).toHaveProperty('disk')
  })

  it('retorna available:false cuando Prometheus no responde', async () => {
    mocks.auth.mockResolvedValue({ user: { id: 'user-1' } })
    mocks.fetch.mockRejectedValue(new Error('connection refused'))

    const { GET } = await import('./route')
    const res = await GET()
    const body = await res.json()

    expect(body.data.droplet.available).toBe(false)
    expect(body.data.elitemini.available).toBe(false)
  })

  it('retorna available:false cuando Prometheus responde pero sin datos del instance', async () => {
    // Regresión: target mal configurado (ej: node-exporter:9100 en vez de localhost:9100)
    // hace que Prometheus responda ok pero sin métricas para el instance esperado
    mocks.auth.mockResolvedValue({ user: { id: 'user-1' } })
    mocks.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'success',
        data: { result: [] }, // Prometheus scrapeó pero no tiene ese instance
      }),
    })

    const { GET } = await import('./route')
    const res = await GET()
    const body = await res.json()

    expect(body.data.droplet.available).toBe(false)
    expect(body.data.elitemini.available).toBe(false)
  })

  it('usa PROMETHEUS_URL del entorno no localhost hardcodeado', async () => {
    mocks.auth.mockResolvedValue({ user: { id: 'user-1' } })
    process.env.PROMETHEUS_URL = 'http://host.docker.internal:9090'
    mocks.fetch.mockResolvedValue(prometheusResponse('10'))

    const { GET } = await import('./route')
    await GET()

    const calledUrl = (mocks.fetch.mock.calls[0][0] as string)
    expect(calledUrl).toContain('host.docker.internal:9090')
  })
})
