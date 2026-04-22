import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  env: {
    openclawBaseUrl: 'http://100.80.59.3:18789',
    openclawGatewayToken: 'gateway-token',
    ollamaBaseUrl: 'http://100.80.59.3:11434',
  },
  isAvailable: vi.fn(),
  fetch: vi.fn(),
}))

vi.mock('@/lib/env', () => ({ env: mocks.env }))
vi.mock('@/lib/ai/ollama', () => ({
  OllamaAIService: {
    isAvailable: mocks.isAvailable,
  },
}))

vi.stubGlobal('fetch', mocks.fetch)

describe('getEliteminiServices', () => {
  beforeEach(() => {
    mocks.isAvailable.mockReset()
    mocks.fetch.mockReset()
  })

  it('considera OpenClaw disponible cuando responde /v1/models', async () => {
    mocks.isAvailable.mockResolvedValue(false)
    mocks.fetch.mockImplementation((input: RequestInfo | URL) => {
      const url = String(input)
      if (url === 'http://100.80.59.3:18789/v1/models') {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            data: [{ id: 'openclaw', object: 'model' }],
          }),
        })
      }

      throw new Error(`Unexpected fetch: ${url}`)
    })

    const { getEliteminiServices } = await import('./elitemini-services')
    const services = await getEliteminiServices()

    expect(services.openclaw.available).toBe(true)
    expect(services.openclaw.version).toBeNull()
    expect(services.openclaw.reason).toBeUndefined()
    expect(mocks.fetch).toHaveBeenCalledWith(
      'http://100.80.59.3:18789/v1/models',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer gateway-token' }),
      })
    )
  })

  it('expone el status HTTP cuando OpenClaw responde con error', async () => {
    mocks.isAvailable.mockResolvedValue(false)
    mocks.fetch.mockImplementation((input: RequestInfo | URL) => {
      const url = String(input)
      if (url === 'http://100.80.59.3:18789/v1/models') {
        return Promise.resolve({
          ok: false,
          status: 404,
        })
      }

      throw new Error(`Unexpected fetch: ${url}`)
    })

    const { getEliteminiServices } = await import('./elitemini-services')
    const services = await getEliteminiServices()

    expect(services.openclaw.available).toBe(false)
    expect(services.openclaw.reason).toBe('OpenClaw respondió 404')
  })
})
