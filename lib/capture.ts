import { z } from 'zod'
import { db } from '@/lib/db'
import { tickets } from '@/lib/db/schema'
import { WhisperTranscriptionService } from '@/lib/ai/whisper'
import { ClaudeAIService } from '@/lib/ai/claude'
import { logEvent } from '@/lib/utils'
import type { Ticket } from '@/lib/types'

const TextInputSchema = z.object({
  text: z.string().min(1, 'El texto no puede estar vacío').max(2000),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})

const MAX_AUDIO_SIZE_BYTES = 10 * 1024 * 1024

type ParsedCaptureInput =
  | { rawText: string; dueDate?: string }
  | { error: string; code: 'VALIDATION_ERROR' | 'TRANSCRIPTION_ERROR'; status?: number }

export async function parseCaptureInput(request: Request): Promise<ParsedCaptureInput> {
  const contentType = request.headers.get('content-type') ?? ''

  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData()
    const audioFile = formData.get('audio') as File | null
    const dueDate = (formData.get('due_date') as string) ?? undefined

    if (!audioFile) {
      return { error: 'No se recibió archivo de audio', code: 'VALIDATION_ERROR' }
    }

    if (audioFile.size > MAX_AUDIO_SIZE_BYTES) {
      return {
        error: 'El archivo de audio supera el límite de 10MB',
        code: 'VALIDATION_ERROR',
      }
    }

    const audioBuffer = Buffer.from(await audioFile.arrayBuffer())
    const transcriber = new WhisperTranscriptionService()

    try {
      const rawText = await transcriber.transcribe(audioBuffer, audioFile.type)
      return { rawText, dueDate }
    } catch {
      return {
        error: 'Error al transcribir el audio',
        code: 'TRANSCRIPTION_ERROR',
        status: 502,
      }
    }
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return { error: 'Body inválido: se esperaba JSON', code: 'VALIDATION_ERROR' }
  }

  const parsed = TextInputSchema.safeParse(body)
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message, code: 'VALIDATION_ERROR' }
  }

  return {
    rawText: parsed.data.text,
    dueDate: parsed.data.due_date,
  }
}

export async function createTicketFromCapturedInput(
  userId: string,
  rawText: string,
  dueDate: string | undefined,
  startTime: number
): Promise<Ticket> {
  const aiService = new ClaudeAIService()
  const structured = await aiService.classifyAndStructure(rawText)
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

  return ticket
}
