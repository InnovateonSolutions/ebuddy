import { describe, it, expect, vi, beforeEach } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireCapability: vi.fn(),
  requireStepUp: vi.fn(),
  requireAuthenticatedUserId: vi.fn(),
  updateTicket: vi.fn(),
  deleteTicket: vi.fn(),
}))

vi.mock('@/lib/auth/permissions', () => ({
  requireCapability: mocks.requireCapability,
  requireStepUp: mocks.requireStepUp,
}))
vi.mock('@/lib/auth/request', () => ({ requireAuthenticatedUserId: mocks.requireAuthenticatedUserId }))
vi.mock('@/features/tickets/server/mutations', () => ({
  updateTicket: mocks.updateTicket,
  deleteTicket: mocks.deleteTicket,
}))
vi.mock('@/features/tickets/server/contracts', () => ({
  updateTicketSchema: { safeParse: (v: unknown) => ({ success: true, data: v }) },
}))

const params = { params: Promise.resolve({ id: 'ticket-1' }) }

describe('PATCH /api/tickets/[id]', () => {
  beforeEach(() => { vi.resetModules(); mocks.requireCapability.mockReset(); mocks.updateTicket.mockReset() })

  it('retorna 403 si no tiene tickets.write', async () => {
    mocks.requireCapability.mockResolvedValue({ response: new Response('', { status: 403 }) })
    const { PATCH } = await import('./route')
    const res = await PATCH(
      new Request('http://localhost/api/tickets/ticket-1', { method: 'PATCH', body: JSON.stringify({ title: 'nuevo' }) }),
      params
    ) as Response
    expect(res.status).toBe(403)
  })

  it('actualiza el ticket con capability válida', async () => {
    mocks.requireCapability.mockResolvedValue({ userId: 'u1', role: 'OWNER', capabilities: ['tickets.write'] })
    mocks.updateTicket.mockResolvedValue({ id: 'ticket-1', title: 'nuevo' })
    const { PATCH } = await import('./route')
    const res = await PATCH(
      new Request('http://localhost/api/tickets/ticket-1', { method: 'PATCH', body: JSON.stringify({ title: 'nuevo' }) }),
      params
    ) as Response
    expect(res.status).toBe(200)
    expect(mocks.updateTicket).toHaveBeenCalledWith('ticket-1', 'u1', expect.objectContaining({ title: 'nuevo' }))
  })
})

describe('DELETE /api/tickets/[id]', () => {
  beforeEach(() => {
    vi.resetModules()
    mocks.requireCapability.mockReset()
    mocks.requireStepUp.mockReset()
    mocks.deleteTicket.mockReset()
  })

  it('retorna 403 si no tiene tickets.write', async () => {
    mocks.requireCapability.mockResolvedValue({ response: new Response('', { status: 403 }) })
    const { DELETE } = await import('./route')
    const res = await DELETE(new Request('http://localhost/api/tickets/ticket-1', { method: 'DELETE' }), params) as Response
    expect(res.status).toBe(403)
  })

  it('retorna 403 si step-up falla', async () => {
    mocks.requireCapability.mockResolvedValue({ userId: 'u1', role: 'OWNER', capabilities: ['tickets.write'] })
    mocks.requireStepUp.mockResolvedValue({ response: new Response('', { status: 403 }) })
    const { DELETE } = await import('./route')
    const res = await DELETE(new Request('http://localhost/api/tickets/ticket-1', { method: 'DELETE' }), params) as Response
    expect(res.status).toBe(403)
  })

  it('elimina el ticket con capability + step-up válidos', async () => {
    mocks.requireCapability.mockResolvedValue({ userId: 'u1', role: 'OWNER', capabilities: ['tickets.write'] })
    mocks.requireStepUp.mockResolvedValue({ userId: 'u1' })
    mocks.deleteTicket.mockResolvedValue(true)
    const { DELETE } = await import('./route')
    const res = await DELETE(new Request('http://localhost/api/tickets/ticket-1', { method: 'DELETE' }), params) as Response
    expect(res.status).toBe(200)
    expect(mocks.deleteTicket).toHaveBeenCalledWith('ticket-1', 'u1')
  })
})
