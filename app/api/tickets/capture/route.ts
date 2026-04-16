import { z } from 'zod'
import { db } from '@/lib/db'
import { tickets } from '@/lib/db/schema'
import { WhisperTranscriptionService } from '@/lib/ai/whisper'
import { ClaudeAIService } from '@/lib/ai/claude'
import { apiSuccess, apiError, getUserIdFromRequest, logEvent } from '@/lib/utils'

const TextInputSchema = z.object({
  text: z.string().min(1, 'El texto no puede estar vacío').max(2000),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})

const MAX_AUDIO_SIZE_BYTES = 10 * 1024 * 1024 // 10MB

export async function POST(request: Request) {
  const startTime = Date.now()
  const userId = getUserIdFromRequest(request)
  if (!userId) return apiError('No autorizado', 'UNAUTHORIZED', 401)

  try {
    const contentType = request.headers.get('content-type') ?? ''
    let rawText: string
    let dueDate: string | undefined

    // ---- CAPTURA POR VOZ ----
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      const audioFile = formData.get('audio') as File | null
      dueDate = (formData.get('due_date') as string) ?? undefined

      if (!audioFile) return apiError('No se recibió archivo de audio', 'VALIDATION_ERROR')
      if (audioFile.size > MAX_AUDIO_SIZE_BYTES) return apiError('El archivo de audio supera el límite de 10MB', 'VALIDATION_ERROR')

      const audioBuffer = Buffer.from(await audioFile.arrayBuffer())
      const transcriber = new WhisperTranscriptionService()
      try {
        rawText = await transcriber.transcribe(audioBuffer, audioFile.type)
      } catch (err) {
        logEvent('transcription.error', { userId, error: String(err) })
        return apiError('Error al transcribir el audio', 'TRANSCRIPTION_ERROR', 502)
      }

    // ---- CAPTURA POR TEXTO ----
    } else {
      let body: unknown
      try { body = await request.json() } catch {
        return apiError('Body inválido: se esperaba JSON', 'VALIDATION_ERROR')
      }
      const parsed = TextInputSchema.safeParse(body)
      if (!parsed.success) return apiError(parsed.error.errors[0].message, 'VALIDATION_ERROR')
      rawText = parsed.data.text
      dueDate = parsed.data.due_date
    }

    // ---- PROCESAMIENTO CON IA ----
    const aiService = new ClaudeAIService()
    let structured
    try {
      structured = await aiService.classifyAndStructure(rawText)
    } catch (err) {
      logEvent('ai.error', { userId, error: String(err) })
      return apiError('Error al procesar con IA', 'AI_INVALID_RESPONSE', 502)
    }

    // ---- GUARDAR EN DB ----
    // La fecha explícita del cliente tiene prioridad.
    // Si no viene, se usa la inferida por Claude desde el texto.
    const resolvedDueDate = dueDate ?? structured.due_date ?? null

    const [ticket] = await db
      .insert(tickets)
      .values({
        userId,
        title: structured.title,
        context: structured.context,
        overview: structured.overview,
        whatToDo: structured.what_to_do,
        nextSteps: structured.next_steps,
        priority: structured.priority,
        status: 'PENDING',
        dueDate: resolvedDueDate,
        rawInput: rawText,
      })
      .returning()

    logEvent('ticket.created', {
      userId,
      ticketId: ticket.id,
      context: ticket.context,
      priority: ticket.priority,
      durationMs: Date.now() - startTime,
    })

    return apiSuccess(ticket)
  } catch (err) {
    logEvent('capture.unexpected_error', { userId: userId ?? 'unknown', error: String(err) })
    return apiError('Error interno del servidor', 'INTERNAL_ERROR', 500)
  }
}
