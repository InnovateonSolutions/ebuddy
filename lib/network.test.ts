import { describe, it, expect, vi, afterEach } from 'vitest'

describe('assertInternalServiceUrl', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  async function get() {
    return (await import('./network')).assertInternalServiceUrl
  }

  it('permite https en producción', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    const fn = await get()
    expect(() => fn('https://openclaw.example.ts.net', 'openclaw')).not.toThrow()
  })

  it('permite IP Tailscale (100.x) con http en producción', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    const fn = await get()
    expect(() => fn('http://100.64.0.5:11434', 'ollama')).not.toThrow()
  })

  it('permite IP privada 10.x con http en producción', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    const fn = await get()
    expect(() => fn('http://10.0.0.5:8080', 'openclaw')).not.toThrow()
  })

  it('permite localhost con http en producción', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    const fn = await get()
    expect(() => fn('http://localhost:11434', 'ollama')).not.toThrow()
  })

  it('lanza en producción si http apunta a host público', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    const fn = await get()
    expect(() => fn('http://external.host.com:8080', 'openclaw'))
      .toThrow(/openclaw.*red privada/)
  })

  it('permite http público en desarrollo', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    const fn = await get()
    expect(() => fn('http://external.host.com:8080', 'openclaw')).not.toThrow()
  })

  it('no lanza si la URL está vacía (spoke no configurado)', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    const fn = await get()
    expect(() => fn('', 'openclaw')).not.toThrow()
  })
})
