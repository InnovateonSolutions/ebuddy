import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  dbInsert: vi.fn(),
  dbValues: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  db: {
    insert: mocks.dbInsert,
  },
}))

describe('auth audit', () => {
  beforeEach(() => {
    mocks.dbInsert.mockReset()
    mocks.dbValues.mockReset()
    mocks.dbInsert.mockReturnValue({ values: mocks.dbValues })
    mocks.dbValues.mockResolvedValue(undefined)
  })

  it('persiste el evento de acceso privilegiado con capability y resultado', async () => {
    const { logPrivilegedAccess } = await import('./audit')

    await logPrivilegedAccess({
      userId: 'owner-1',
      capability: 'infra.read',
      action: 'route.access',
      resource: '/api/infra/metrics',
      outcome: 'allowed',
    })

    expect(mocks.dbInsert).toHaveBeenCalled()
    expect(mocks.dbValues).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'owner-1',
      capability: 'infra.read',
      resource: '/api/infra/metrics',
      outcome: 'allowed',
    }))
  })
})
