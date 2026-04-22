import { beforeEach, describe, expect, it, vi } from 'vitest'

const realEnv = { ...process.env }

describe('getPrometheusDiagnostics', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.restoreAllMocks()
    process.env = { ...realEnv }
    delete process.env.PROMETHEUS_URL
    delete process.env.ELITEMINI_INSTANCE
  })

  it('trata Prometheus como un diagnóstico opcional cuando no está configurado', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const { getPrometheusDiagnostics } = await import('./prometheus-metrics')
    const diagnostics = await getPrometheusDiagnostics()

    expect(diagnostics.configured).toBe(false)
    expect(diagnostics.available).toBe(false)
    expect(diagnostics.reason).toContain('opcional')
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
