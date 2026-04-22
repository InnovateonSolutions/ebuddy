import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireAuthenticatedUserId: vi.fn(),
  apiSuccess: vi.fn(),
  apiError: vi.fn(),
  logEvent: vi.fn(),
  parseCaptureInput: vi.fn(),
  createTicketFromCapturedInput: vi.fn(),
  AICaptureError: class FakeAICaptureError extends Error {
    code: 'AI_TIMEOUT' | 'AI_INVALID_RESPONSE' | 'AI_UPSTREAM_ERROR'

    constructor(code: 'AI_TIMEOUT' | 'AI_INVALID_RESPONSE' | 'AI_UPSTREAM_ERROR', message: string) {
      super(message)
      this.code = code
    }
  },
}))

vi.mock('@/lib/utils', () => ({
  apiSuccess: mocks.apiSuccess,
  apiError: mocks.apiError,
  logEvent: mocks.logEvent,
}))

vi.mock('@/lib/auth/request', () => ({
  requireAuthenticatedUserId: mocks.requireAuthenticatedUserId,
}))

vi.mock('@/features/tickets/server/capture', () => ({
  AICaptureError: mocks.AICaptureError,
  parseCaptureInput: mocks.parseCaptureInput,
  createTicketFromCapturedInput: mocks.createTicketFromCapturedInput,
}))

import { POST } from './route'

describe('POST /api/tickets/capture', () => {
  beforeEach(() => {
    mocks.requireAuthenticatedUserId.mockReturnValue({ userId: 'user-123' })
    mocks.parseCaptureInput.mockResolvedValue({ rawText: 'texto', dueDate: undefined })
    mocks.apiSuccess.mockReturnValue(Response.json({ success: true }))
    mocks.apiError.mockImplementation((error: string, code: string, status = 400) =>
      Response.json({ success: false, error, code }, { status })
    )
  })

  it('devuelve AI_TIMEOUT cuando la IA excede el tiempo límite', async () => {
    mocks.createTicketFromCapturedInput.mockRejectedValueOnce(
      new mocks.AICaptureError('AI_TIMEOUT', 'AI_TIMEOUT: Claude no respondió en 30 segundos')
    )

    const response = await POST(new Request('http://localhost/api/tickets/capture', { method: 'POST' })) as Response
    const json = await response.json()

    expect(response.status).toBe(504)
    expect(json.code).toBe('AI_TIMEOUT')
    expect(json.error).toContain('tardó demasiado')
  })

  it('devuelve mensaje útil cuando Claude responde JSON inválido', async () => {
    mocks.createTicketFromCapturedInput.mockRejectedValueOnce(
      new mocks.AICaptureError('AI_INVALID_RESPONSE', 'Claude devolvió JSON inválido: ```json')
    )

    const response = await POST(new Request('http://localhost/api/tickets/capture', { method: 'POST' })) as Response
    const json = await response.json()

    expect(response.status).toBe(502)
    expect(json.code).toBe('AI_INVALID_RESPONSE')
    expect(json.error).toContain('formato inesperado')
  })

  it('devuelve INTERNAL_ERROR cuando falla una dependencia interna', async () => {
    mocks.createTicketFromCapturedInput.mockRejectedValueOnce(
      new Error('db down')
    )

    const response = await POST(new Request('http://localhost/api/tickets/capture', { method: 'POST' })) as Response
    const json = await response.json()

    expect(response.status).toBe(500)
    expect(json.code).toBe('INTERNAL_ERROR')
  })

  it('devuelve AI_UPSTREAM_ERROR cuando el proveedor de IA no responde bien', async () => {
    mocks.createTicketFromCapturedInput.mockRejectedValueOnce(
      new mocks.AICaptureError('AI_UPSTREAM_ERROR', 'provider unavailable')
    )

    const response = await POST(new Request('http://localhost/api/tickets/capture', { method: 'POST' })) as Response
    const json = await response.json()

    expect(response.status).toBe(502)
    expect(json.code).toBe('AI_UPSTREAM_ERROR')
  })
})
