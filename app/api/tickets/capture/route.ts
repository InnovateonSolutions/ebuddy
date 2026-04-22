import { apiSuccess, apiError, logEvent } from '@/lib/utils'
import { requireAuthenticatedUserId } from '@/lib/auth/request'
import { AICaptureError, createTicketFromCapturedInput, parseCaptureInput } from '@/features/tickets/server/capture'

export async function POST(request: Request) {
  const startTime = Date.now()
  const auth = requireAuthenticatedUserId(request)
  if ('response' in auth) return auth.response
  const { userId } = auth

  try {
    const parsedInput = await parseCaptureInput(request)
    if ('error' in parsedInput) {
      if (parsedInput.code === 'TRANSCRIPTION_ERROR') {
        logEvent('transcription.error', { userId, error: parsedInput.error })
      }
      return apiError(parsedInput.error, parsedInput.code, parsedInput.status)
    }
    let ticket
    try {
      ticket = await createTicketFromCapturedInput(
        userId,
        parsedInput.rawText,
        parsedInput.dueDate,
        startTime
      )
    } catch (err) {
      logEvent('ai.error', { userId, error: String(err) })
      if (err instanceof AICaptureError && err.code === 'AI_TIMEOUT') {
        return apiError(
          'La IA tardó demasiado en responder. Intenta de nuevo.',
          'AI_TIMEOUT',
          504
        )
      }
      if (err instanceof AICaptureError && err.code === 'AI_INVALID_RESPONSE') {
        return apiError(
          'La IA devolvió un formato inesperado. Intenta de nuevo.',
          'AI_INVALID_RESPONSE',
          502
        )
      }
      if (err instanceof AICaptureError && err.code === 'AI_UPSTREAM_ERROR') {
        return apiError(
          'La IA no estuvo disponible. Intenta de nuevo.',
          'AI_UPSTREAM_ERROR',
          502
        )
      }
      logEvent('capture.internal_error', { userId, error: String(err) })
      return apiError('Error interno del servidor', 'INTERNAL_ERROR', 500)
    }

    return apiSuccess(ticket)
  } catch (err) {
    logEvent('capture.unexpected_error', { userId: userId ?? 'unknown', error: String(err) })
    return apiError('Error interno del servidor', 'INTERNAL_ERROR', 500)
  }
}
