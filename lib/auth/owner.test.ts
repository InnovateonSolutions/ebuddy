import { beforeEach, describe, it, expect, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  dbSelect: vi.fn(),
  dbFrom: vi.fn(),
  dbWhere: vi.fn(),
  dbLimit: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  db: { select: mocks.dbSelect },
}))

vi.mock('@/lib/db/schema', () => ({
  users: { role: 'role', id: 'id' },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((a: unknown, b: unknown) => ({ col: a, val: b })),
}))

describe('resolveOwnerUserId', () => {
  beforeEach(() => {
    vi.resetModules()
    mocks.dbSelect.mockReset()
    mocks.dbFrom.mockReset()
    mocks.dbWhere.mockReset()
    mocks.dbLimit.mockReset()
    delete process.env.WHATSAPP_OWNER_USER_ID

    mocks.dbSelect.mockReturnValue({ from: mocks.dbFrom })
    mocks.dbFrom.mockReturnValue({ where: mocks.dbWhere })
    mocks.dbWhere.mockReturnValue({ limit: mocks.dbLimit })
  })

  it('retorna el userId del primer OWNER en DB', async () => {
    mocks.dbLimit.mockResolvedValue([{ id: 'db-owner-id' }])
    const { resolveOwnerUserId } = await import('./owner')
    expect(await resolveOwnerUserId()).toBe('db-owner-id')
  })

  it('usa env var como fallback si no hay OWNER en DB', async () => {
    mocks.dbLimit.mockResolvedValue([])
    process.env.WHATSAPP_OWNER_USER_ID = 'env-owner-id'
    const { resolveOwnerUserId } = await import('./owner')
    expect(await resolveOwnerUserId()).toBe('env-owner-id')
  })

  it('retorna null si no hay OWNER en DB ni env var', async () => {
    mocks.dbLimit.mockResolvedValue([])
    const { resolveOwnerUserId } = await import('./owner')
    expect(await resolveOwnerUserId()).toBeNull()
  })
})
