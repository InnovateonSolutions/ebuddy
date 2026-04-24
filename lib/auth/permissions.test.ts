import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  requireAuthenticatedUserId: vi.fn(),
  dbSelect: vi.fn(),
  dbFrom: vi.fn(),
  dbWhere: vi.fn(),
  dbUpdate: vi.fn(),
  dbSet: vi.fn(),
  dbUpdateWhere: vi.fn(),
  logPrivilegedAccess: vi.fn(),
}))

vi.mock('@/lib/auth/config', () => ({ auth: mocks.auth }))
vi.mock('@/lib/auth/request', () => ({ requireAuthenticatedUserId: mocks.requireAuthenticatedUserId }))
vi.mock('@/lib/auth/audit', () => ({ logPrivilegedAccess: mocks.logPrivilegedAccess }))
vi.mock('@/lib/db', () => ({
  db: {
    select: mocks.dbSelect,
    from: mocks.dbFrom,
    where: mocks.dbWhere,
    update: mocks.dbUpdate,
  },
}))

describe('permissions', () => {
  beforeEach(() => {
    mocks.auth.mockReset()
    mocks.requireAuthenticatedUserId.mockReset()
    mocks.dbSelect.mockReset()
    mocks.dbFrom.mockReset()
    mocks.dbWhere.mockReset()
    mocks.dbUpdate.mockReset()
    mocks.dbSet.mockReset()
    mocks.dbUpdateWhere.mockReset()
    mocks.logPrivilegedAccess.mockReset()
    delete process.env.OWNER_EMAILS

    mocks.dbSelect.mockReturnValue({ from: mocks.dbFrom })
    mocks.dbFrom.mockReturnValue({ where: mocks.dbWhere })
    mocks.dbUpdate.mockReturnValue({ set: mocks.dbSet })
    mocks.dbSet.mockReturnValue({ where: mocks.dbUpdateWhere })
    mocks.dbUpdateWhere.mockResolvedValue(undefined)
  })

  it('otorga capabilities owner cuando el rol persistido es OWNER', async () => {
    mocks.auth.mockResolvedValue({ user: { id: 'owner-1', email: 'owner@example.com' } })
    mocks.dbWhere.mockResolvedValue([{ role: 'OWNER' }])

    const { getAuthorizationContext } = await import('./permissions')
    const ctx = await getAuthorizationContext()

    expect('response' in ctx).toBe(false)
    if ('response' in ctx) return
    expect(ctx.role).toBe('OWNER')
    expect(ctx.capabilities).toContain('infra.read')
    expect(ctx.capabilities).toContain('gateway.read')
  })

  it('bootstrapea owner desde OWNER_EMAILS y persiste el rol', async () => {
    process.env.OWNER_EMAILS = 'owner@example.com'
    mocks.auth.mockResolvedValue({ user: { id: 'owner-1', email: 'owner@example.com' } })
    mocks.dbWhere.mockResolvedValue([{ role: 'MEMBER' }])

    const { getAuthorizationContext } = await import('./permissions')
    const ctx = await getAuthorizationContext()

    expect('response' in ctx).toBe(false)
    if ('response' in ctx) return
    expect(ctx.role).toBe('OWNER')
    expect(mocks.dbUpdate).toHaveBeenCalled()
    expect(ctx.capabilities).toContain('costs.read')
  })

  it('rechaza capability no otorgada al miembro', async () => {
    mocks.auth.mockResolvedValue({ user: { id: 'user-2', email: 'user@example.com' } })
    mocks.dbWhere.mockResolvedValue([{ role: 'MEMBER' }])
    mocks.requireAuthenticatedUserId.mockReturnValue({ userId: 'user-2' })

    const { requireCapability } = await import('./permissions')
    const result = await requireCapability('infra.read', new Request('http://localhost/api/infra/metrics'), {
      action: 'route.access',
      resource: '/api/infra/metrics',
    })

    expect('response' in result).toBe(true)
    if (!('response' in result)) return
    expect(result.response!.status).toBe(403)
    expect(mocks.logPrivilegedAccess).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'user-2',
      capability: 'infra.read',
      outcome: 'denied',
      resource: '/api/infra/metrics',
    }))
  })

  it('owner tiene las capabilities de ejecucion y gestion', async () => {
    mocks.auth.mockResolvedValue({ user: { id: 'owner-1', email: 'owner@example.com' } })
    mocks.dbWhere.mockResolvedValue([{ role: 'OWNER' }])

    const { getAuthorizationContext } = await import('./permissions')
    const ctx = await getAuthorizationContext()

    expect('response' in ctx).toBe(false)
    if ('response' in ctx) return
    expect(ctx.capabilities).toContain('gateway.execute')
    expect(ctx.capabilities).toContain('infra.write')
    expect(ctx.capabilities).toContain('secrets.manage')
    expect(ctx.capabilities).toContain('users.manage')
  })

  it('member no tiene capabilities de ejecucion ni gestion', async () => {
    mocks.auth.mockResolvedValue({ user: { id: 'user-2', email: 'user@example.com' } })
    mocks.dbWhere.mockResolvedValue([{ role: 'MEMBER' }])

    const { getAuthorizationContext } = await import('./permissions')
    const ctx = await getAuthorizationContext()

    expect('response' in ctx).toBe(false)
    if ('response' in ctx) return
    expect(ctx.capabilities).not.toContain('gateway.execute')
    expect(ctx.capabilities).not.toContain('infra.write')
    expect(ctx.capabilities).not.toContain('secrets.manage')
    expect(ctx.capabilities).not.toContain('users.manage')
  })

  it('requireCapability bloquea gateway.execute a member', async () => {
    mocks.auth.mockResolvedValue({ user: { id: 'user-2', email: 'user@example.com' } })
    mocks.dbWhere.mockResolvedValue([{ role: 'MEMBER' }])
    mocks.requireAuthenticatedUserId.mockReturnValue({ userId: 'user-2' })

    const { requireCapability } = await import('./permissions')
    const result = await requireCapability('gateway.execute', new Request('http://localhost/api/gateway/send'), {
      action: 'gateway.send',
      resource: '/api/gateway/send',
    })

    expect('response' in result).toBe(true)
    if (!('response' in result)) return
    expect(result.response!.status).toBe(403)
    expect(mocks.logPrivilegedAccess).toHaveBeenCalledWith(expect.objectContaining({
      capability: 'gateway.execute',
      outcome: 'denied',
    }))
  })

  it('registra acceso permitido cuando la capability existe', async () => {
    mocks.auth.mockResolvedValue({ user: { id: 'owner-1', email: 'owner@example.com' } })
    mocks.dbWhere.mockResolvedValue([{ role: 'OWNER' }])
    mocks.requireAuthenticatedUserId.mockReturnValue({ userId: 'owner-1' })

    const { requireCapability } = await import('./permissions')
    const result = await requireCapability('infra.read', new Request('http://localhost/api/infra/metrics'), {
      action: 'route.access',
      resource: '/api/infra/metrics',
    })

    expect('response' in result).toBe(false)
    expect(mocks.logPrivilegedAccess).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'owner-1',
      capability: 'infra.read',
      outcome: 'allowed',
      resource: '/api/infra/metrics',
    }))
  })
})
