import { z } from 'zod'
import type { IAIService, StructuredTicket } from './types'

const StructuredTicketSchema = z.object({
  context: z.enum(['NEGOCIO', 'PERSONAL']),
  title: z.string().min(1).max(200),
  overview: z.string().min(1).max(2000),
  what_to_do: z.string().min(1).max(1000),
  next_steps: z.array(z.string().min(1)).min(1).max(10),
  priority: z.enum(['ALTA', 'MEDIA', 'BAJA']),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
})

function buildSystemPrompt(todayISO: string, dayOfWeek: string): string {
  return `Eres un asistente de productividad personal. Analiza el input del usuario y conviértelo en un ticket de acción estructurado.

FECHA DE HOY: ${todayISO} (${dayOfWeek})

REGLAS:
- NEGOCIO: trabajo, proyectos, clientes, finanzas de empresa
- PERSONAL: familia, hobbies, salud, servicios del hogar, pagos personales

Responde ÚNICAMENTE con un objeto JSON válido con esta estructura exacta:
{
  "context": "NEGOCIO" | "PERSONAL",
  "title": "verbo de acción + objeto (máx 10 palabras)",
  "overview": "contexto completo para entender meses después",
  "what_to_do": "UNA acción concreta e inmediata",
  "next_steps": ["paso 1", "paso 2", "..."],
  "priority": "ALTA" | "MEDIA" | "BAJA",
  "due_date": "YYYY-MM-DD" | null
}

Sin texto antes ni después del JSON.`
}

function parseJson(raw: string): unknown {
  const candidates = [
    raw.trim(),
    raw.replace(/^```json\s*/i, '').replace(/```$/i, '').trim(),
    (raw.match(/\{[\s\S]*\}/) ?? [])[0]?.trim() ?? '',
  ]
  for (const c of candidates) {
    try { return JSON.parse(c) } catch { /* try next */ }
  }
  throw new Error('JSON inválido en respuesta de Ollama')
}

export class OllamaAIService implements IAIService {
  private baseUrl: string
  private model: string

  constructor(
    baseUrl = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434',
    model = 'llama3:latest'
  ) {
    this.baseUrl = baseUrl.replace(/\/$/, '')
    this.model = model
  }

  async classifyAndStructure(
    text: string,
    timezone = 'America/Tijuana'
  ): Promise<StructuredTicket> {
    const sanitized = text.slice(0, 2000).trim()
    const todayISO = new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(new Date())
    const dayOfWeek = new Intl.DateTimeFormat('es-MX', {
      weekday: 'long',
      timeZone: timezone,
    }).format(new Date())

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 60_000)

    let res: Response
    try {
      res = await fetch(`${this.baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          model: this.model,
          temperature: 0.1,
          stream: false,
          messages: [
            { role: 'system', content: buildSystemPrompt(todayISO, dayOfWeek) },
            { role: 'user', content: `<user_input>\n${sanitized}\n</user_input>` },
          ],
        }),
      })
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError')
        throw new Error('AI_TIMEOUT: Ollama no respondió en 60 segundos')
      throw new Error(`Ollama no disponible: ${err instanceof Error ? err.message : err}`)
    } finally {
      clearTimeout(timer)
    }

    if (!res.ok) throw new Error(`Ollama error HTTP ${res.status}`)

    const json = await res.json() as { choices?: { message?: { content?: string } }[] }
    const content = json.choices?.[0]?.message?.content ?? ''
    if (!content) throw new Error('Ollama devolvió respuesta vacía')

    const parsed = parseJson(content)
    const result = StructuredTicketSchema.safeParse(parsed)
    if (!result.success)
      throw new Error(`Respuesta de Ollama no coincide con el schema: ${result.error.message}`)

    return result.data
  }

  static async isAvailable(
    baseUrl = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434'
  ): Promise<boolean> {
    try {
      const res = await fetch(`${baseUrl.replace(/\/$/, '')}/api/version`, {
        signal: AbortSignal.timeout(3000),
      })
      return res.ok
    } catch {
      return false
    }
  }
}
