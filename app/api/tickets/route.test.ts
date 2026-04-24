import { describe, it, expect, vi, beforeEach } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireAuthenticatedUserId: vi.fn(),
  dbInsert: vi.fn(),
  dbValues: vi.fn(),
  dbReturning: vi.fn(),
}))

vi.mock('@/lib/auth/request', () => ({ requireAuthenticatedUserId: mocks.requireAuthenticatedUserId }))
vi.mock('@/lib/db', () => ({ db: { insert: mocks.dbInsert } }))
vi.mock('@/lib/db/schema', () => ({ tickets: {} }))
vi.mock('@/features/tickets/server/contracts', () => ({
  createTicketSchema: { safeParse: (v: unknown) => ({ success: true, data: v }) },
  mapCreateTicketInputToDb: (v: unknown) => v,
}))
vi.mock('@/lib/utils', async (orig) => ({ ...(await orig<typeof import('@/lib/utils')>()), logEvent: vi.fn() }))

describe('POST /api/tickets', () => {
  beforeEach(() => {
    vi.resetModules()
    mocks.requireAuthenticatedUserId.mockReset()
    mocks.dbInsert.mockReset()
    mocks.dbInsert.mockReturnValue({ values: mocks.dbValues })
    mocks.dbValues.mockReturnValue({ returning: mocks.dbReturning })
  })

  it('retorna 401 sin autenticación', async () => {
    mocks.requireAuthenticatedUserId.mockReturnValue({ response: new Response('', { status: 401 }) })
    const { POST } = await import('./route')
    const res = await POST(new Request('http://localhost/api/tickets', { method: 'POST', body: '{}' })) as Response
    expect(res.status).toBe(401)
  })

  it('crea un ticket y lo retorna', async () => {
    mocks.requireAuthenticatedUserId.mockReturnValue({ userId: 'u1' })
    mocks.dbReturning.mockResolvedValue([{ id: 't1', title: 'Nuevo ticket', context: 'NEGOCIO', priority: 'ALTA' }])
    const { POST } = await import('./route')
    const res = await POST(new Request('http://localhost/api/tickets', {
      method: 'POST',
      body: JSON.stringify({ title: 'Nuevo ticket', context: 'NEGOCIO', priority: 'ALTA' }),
    })) as Response
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.id).toBe('t1')
  })
})
