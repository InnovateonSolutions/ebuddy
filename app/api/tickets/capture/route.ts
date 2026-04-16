import { apiSuccess, apiError, getUserIdFromRequest, logEvent } from '@/lib/utils'
import { createTicketFromCapturedInput, parseCaptureInput } from '@/lib/capture'

export async function POST(request: Request) {
  const startTime = Date.now()
  const userId = getUserIdFromRequest(request)
  if (!userId) return apiError('No autorizado', 'UNAUTHORIZED', 401)

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
      return apiError('Error al procesar con IA', 'AI_INVALID_RESPONSE', 502)
    }

    return apiSuccess(ticket)
  } catch (err) {
    logEvent('capture.unexpected_error', { userId: userId ?? 'unknown', error: String(err) })
    return apiError('Error interno del servidor', 'INTERNAL_ERROR', 500)
  }
}
