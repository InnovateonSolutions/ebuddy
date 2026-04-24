import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  dbSelect: vi.fn(),
  dbFrom: vi.fn(),
  dbWhere: vi.fn(),
  dbInsert: vi.fn(),
  dbValues: vi.fn(),
  dbOnConflictDoUpdate: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  db: {
    select: mocks.dbSelect,
    insert: mocks.dbInsert,
  },
}))

vi.mock('@/lib/db/schema', () => ({
  integrations: { name: 'name', id: 'id', status: 'status', lastCheckedAt: 'lastCheckedAt', metadata: 'metadata' },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((a: unknown, b: unknown) => ({ col: a, val: b })),
}))

describe('integrations service', () => {
  beforeEach(() => {
    vi.resetModules()
    mocks.dbSelect.mockReset()
    mocks.dbFrom.mockReset()
    mocks.dbWhere.mockReset()
    mocks.dbInsert.mockReset()
    mocks.dbValues.mockReset()
    mocks.dbOnConflictDoUpdate.mockReset()

    mocks.dbSelect.mockReturnValue({ from: mocks.dbFrom })
    mocks.dbFrom.mockReturnValue({ where: mocks.dbWhere })
    mocks.dbInsert.mockReturnValue({ values: mocks.dbValues })
    mocks.dbValues.mockReturnValue({ onConflictDoUpdate: mocks.dbOnConflictDoUpdate })
    mocks.dbOnConflictDoUpdate.mockResolvedValue(undefined)
  })

  it('retorna la integración si existe en DB', async () => {
    const row = { id: 'i1', name: 'openclaw', status: 'active', lastCheckedAt: new Date(), metadata: null }
    mocks.dbWhere.mockResolvedValue([row])

    const { getIntegrationStatus } = await import('./service')
    const result = await getIntegrationStatus('openclaw')

    expect(result).toEqual(row)
  })

  it('retorna null si la integración no existe', async () => {
    mocks.dbWhere.mockResolvedValue([])

    const { getIntegrationStatus } = await import('./service')
    const result = await getIntegrationStatus('openclaw')

    expect(result).toBeNull()
  })

  it('upsert graba status y lastCheckedAt', async () => {
    const { upsertIntegrationStatus } = await import('./service')
    await upsertIntegrationStatus('openclaw', 'active', { version: '1.2' })

    expect(mocks.dbInsert).toHaveBeenCalled()
    expect(mocks.dbValues).toHaveBeenCalledWith(expect.objectContaining({
      name: 'openclaw',
      status: 'active',
      metadata: { version: '1.2' },
    }))
    expect(mocks.dbOnConflictDoUpdate).toHaveBeenCalledWith(expect.objectContaining({
      target: expect.anything(),
      set: expect.objectContaining({ status: 'active' }),
    }))
  })
})
