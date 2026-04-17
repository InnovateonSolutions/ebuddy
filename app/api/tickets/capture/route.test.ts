import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getUserIdFromRequest: vi.fn(),
  apiSuccess: vi.fn(),
  apiError: vi.fn(),
  logEvent: vi.fn(),
  parseCaptureInput: vi.fn(),
  createTicketFromCapturedInput: vi.fn(),
}))

vi.mock('@/lib/utils', () => ({
  getUserIdFromRequest: mocks.getUserIdFromRequest,
  apiSuccess: mocks.apiSuccess,
  apiError: mocks.apiError,
  logEvent: mocks.logEvent,
}))

vi.mock('@/lib/capture', () => ({
  parseCaptureInput: mocks.parseCaptureInput,
  createTicketFromCapturedInput: mocks.createTicketFromCapturedInput,
}))

import { POST } from './route'

describe('POST /api/tickets/capture', () => {
  beforeEach(() => {
    mocks.getUserIdFromRequest.mockReturnValue('user-123')
    mocks.parseCaptureInput.mockResolvedValue({ rawText: 'texto', dueDate: undefined })
    mocks.apiSuccess.mockReturnValue(Response.json({ success: true }))
    mocks.apiError.mockImplementation((error: string, code: string, status = 400) =>
      Response.json({ success: false, error, code }, { status })
    )
  })

  it('devuelve AI_TIMEOUT cuando la IA excede el tiempo límite', async () => {
    mocks.createTicketFromCapturedInput.mockRejectedValueOnce(
      new Error('AI_TIMEOUT: Claude no respondió en 30 segundos')
    )

    const response = await POST(new Request('http://localhost/api/tickets/capture', { method: 'POST' }))
    const json = await response.json()

    expect(response.status).toBe(504)
    expect(json.code).toBe('AI_TIMEOUT')
    expect(json.error).toContain('tardó demasiado')
  })

  it('devuelve mensaje útil cuando Claude responde JSON inválido', async () => {
    mocks.createTicketFromCapturedInput.mockRejectedValueOnce(
      new Error('Claude devolvió JSON inválido: ```json')
    )

    const response = await POST(new Request('http://localhost/api/tickets/capture', { method: 'POST' }))
    const json = await response.json()

    expect(response.status).toBe(502)
    expect(json.code).toBe('AI_INVALID_RESPONSE')
    expect(json.error).toContain('formato inesperado')
  })
})
