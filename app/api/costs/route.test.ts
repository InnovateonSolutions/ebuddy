import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireCapability: vi.fn(),
  getDOCostSnapshot: vi.fn(),
}))

vi.mock('@/lib/auth/permissions', () => ({ requireCapability: mocks.requireCapability }))
vi.mock('@/features/costs/server/do-billing', () => ({ getDOCostSnapshot: mocks.getDOCostSnapshot }))

describe('GET /api/costs', () => {
  beforeEach(() => {
    mocks.requireCapability.mockReset()
    mocks.getDOCostSnapshot.mockReset()
  })

  it('retorna 403 si el actor no tiene costs.read', async () => {
    mocks.requireCapability.mockResolvedValue({
      response: Response.json({ error: 'Forbidden' }, { status: 403 }),
    })

    const { GET } = await import('./route')
    const res = await GET() as Response

    expect(res.status).toBe(403)
    expect(mocks.getDOCostSnapshot).not.toHaveBeenCalled()
  })

  it('retorna el snapshot cuando el actor tiene costs.read', async () => {
    mocks.requireCapability.mockResolvedValue({
      session: { user: { id: 'owner-1' } },
      role: 'OWNER',
      capabilities: ['costs.read'],
      userId: 'owner-1',
    })
    mocks.getDOCostSnapshot.mockResolvedValue({ available: true })

    const { GET } = await import('./route')
    const res = await GET() as Response
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data.available).toBe(true)
  })
})
