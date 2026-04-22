import { z } from 'zod'
import { db } from '@/lib/db'
import { tickets } from '@/lib/db/schema'
import { WhisperTranscriptionService } from '@/lib/ai/whisper'
import { getAIService } from '@/lib/ai/provider'
import { db as dbPrefs } from '@/lib/db'
import { userPreferences } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { logEvent } from '@/lib/utils'
import type { Ticket } from '@/lib/types'
import type { StructuredTicket } from '@/lib/ai/types'

const TextInputSchema = z.object({
  text: z.string().min(1, 'El texto no puede estar vacío').max(2000),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})

const MAX_AUDIO_SIZE_BYTES = 10 * 1024 * 1024

type AICaptureErrorCode = 'AI_TIMEOUT' | 'AI_INVALID_RESPONSE' | 'AI_UPSTREAM_ERROR'

export class AICaptureError extends Error {
  code: AICaptureErrorCode

  constructor(code: AICaptureErrorCode, message: string) {
    super(message)
    this.name = 'AICaptureError'
    this.code = code
  }
}

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
  const prefs = await dbPrefs
    .select({ aiProvider: userPreferences.aiProvider, ollamaModel: userPreferences.ollamaModel })
    .from(userPreferences)
    .where(eq(userPreferences.userId, userId))
    .then((rows) => rows[0] ?? null)

  type ValidProvider = import('@/lib/ai/provider').AIProvider
  const provider = (prefs?.aiProvider ?? 'claude') as ValidProvider
  const aiService = getAIService(provider, prefs?.ollamaModel ?? undefined)
  let structured: StructuredTicket
  try {
    structured = await aiService.classifyAndStructure(rawText)
  } catch (error) {
    const aiError = normalizeAICaptureError(error)
    const fallback = aiError.code === 'AI_INVALID_RESPONSE'
      ? buildFallbackTicket(rawText)
      : null
    if (!fallback) throw aiError
    structured = fallback
  }
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

function normalizeAICaptureError(error: unknown): AICaptureError {
  const message = error instanceof Error ? error.message : String(error)

  if (message.startsWith('AI_TIMEOUT:')) {
    return new AICaptureError('AI_TIMEOUT', message)
  }

  if (
    message.includes('JSON inválido') ||
    message.includes('schema') ||
    message.includes('contenido inesperado') ||
    message.includes('respuesta vacía')
  ) {
    return new AICaptureError('AI_INVALID_RESPONSE', message)
  }

  return new AICaptureError('AI_UPSTREAM_ERROR', message)
}

function buildFallbackTicket(rawText: string): StructuredTicket | null {
  const trimmed = rawText.trim()
  if (!trimmed) return null

  const lower = trimmed.toLowerCase()
  const PERSONAL_SIGNALS = [
    'personal', 'casa', 'hogar', 'familia', 'mamá', 'papá', 'hijo', 'hija',
    'amigo', 'salud', 'médico', 'doctor', 'gym', 'internet de', 'luz de',
    'agua de', 'renta', 'supermercado', 'compras',
  ]
  const context = PERSONAL_SIGNALS.some((s) => lower.includes(s)) ? 'PERSONAL' : 'NEGOCIO'

  let title = trimmed
    .replace(/^(crear|crea|agregar|agrega)\s+(un\s+)?ticket\s+/i, '')
    .replace(/\s+en\s+(negocio|personal)\s*$/i, '')
    .replace(/\s+/g, ' ')
    .trim()

  if (!title) {
    title = trimmed
  }

  return {
    context,
    title: title.slice(0, 200),
    overview: '',
    what_to_do: title.slice(0, 500),
    next_steps: [],
    priority: 'MEDIA',
    due_date: null,
  }
}
