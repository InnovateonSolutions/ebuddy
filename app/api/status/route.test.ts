import { describe, it, expect, vi, beforeEach } from 'vitest'

const mocks = vi.hoisted(() => ({ getSystemStatus: vi.fn() }))
vi.mock('@/features/status/server/service', () => ({ getSystemStatus: mocks.getSystemStatus }))

describe('GET /api/status', () => {
  beforeEach(() => { vi.resetModules(); mocks.getSystemStatus.mockReset() })

  it('retorna el resultado de getSystemStatus', async () => {
    mocks.getSystemStatus.mockResolvedValue({ ok: true, version: '1.0' })
    const { GET } = await import('./route')
    const res = await GET() as Response
    const body = await res.json()
    expect(body.ok).toBe(true)
  })
})
