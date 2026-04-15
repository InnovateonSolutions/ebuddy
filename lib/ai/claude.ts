import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import { env } from '@/lib/env'
import type { IAIService, StructuredTicket } from './types'

// Schema Zod para validar la respuesta de Claude
const StructuredTicketSchema = z.object({
  context: z.enum(['NEGOCIO', 'PERSONAL']),
  title: z.string().min(1).max(200),
  overview: z.string().min(1).max(2000),
  what_to_do: z.string().min(1).max(1000),
  next_steps: z.array(z.string().min(1)).min(1).max(10),
  priority: z.enum(['ALTA', 'MEDIA', 'BAJA']),
})

const SYSTEM_PROMPT = `Eres un asistente de productividad personal experto en organización y gestión de tareas.

Tu trabajo es analizar el input del usuario (texto transcrito de voz o texto directo) y convertirlo en un ticket de acción estructurado.

REGLAS DE CLASIFICACIÓN:
- NEGOCIO: trabajo, proyectos profesionales, clientes, iniciativas de negocio, finanzas de empresa
- PERSONAL: familia, amigos, hobbies, salud personal, compromisos personales, vida social

REGLAS DE OUTPUT:
- Responde ÚNICAMENTE con un objeto JSON válido. Sin texto antes ni después del JSON.
- El JSON debe seguir exactamente la estructura especificada.
- title: corto, accionable, máximo 10 palabras. Empieza con verbo de acción.
- overview: contexto completo del tema para que al volver a leerlo meses después se entienda todo.
- what_to_do: UNA acción concreta e inmediata. Específica, sin ambigüedad.
- next_steps: array de 2-5 pasos ordenados cronológicamente. Cada paso es una acción concreta.
- priority: ALTA si tiene deadline inminente o consecuencias graves. MEDIA si es importante pero no urgente. BAJA si puede esperar.

EJEMPLOS:

Input: "tengo que llamar a juan del banco para lo del crédito hipotecario que vence el viernes"
Output:
{
  "context": "PERSONAL",
  "title": "Llamar a Juan del banco sobre crédito hipotecario",
  "overview": "Crédito hipotecario con vencimiento el viernes. Juan es el contacto en el banco. Requiere llamada urgente para resolver situación antes del plazo.",
  "what_to_do": "Llamar a Juan al banco hoy antes de las 17:00",
  "next_steps": ["Buscar número de Juan en contactos", "Llamar y preguntar por el estado del crédito", "Confirmar qué documentos necesitan antes del viernes", "Enviar documentos requeridos"],
  "priority": "ALTA"
}

Input: "quiero organizar una cena sorpresa para el cumpleaños de mi mamá el próximo mes"
Output:
{
  "context": "PERSONAL",
  "title": "Organizar cena sorpresa cumpleaños mamá",
  "overview": "Planear cena sorpresa para el cumpleaños de mamá el próximo mes. Requiere coordinar invitados, lugar y fecha.",
  "what_to_do": "Definir fecha exacta y lista de invitados esta semana",
  "next_steps": ["Confirmar fecha exacta del cumpleaños", "Hacer lista de invitados y conseguir contactos", "Elegir restaurante o lugar", "Coordinar con familia para mantener sorpresa", "Hacer reservación"],
  "priority": "BAJA"
}

Responde solo con el JSON. Nada más.`

export class ClaudeAIService implements IAIService {
  private client: Anthropic

  constructor() {
    this.client = new Anthropic({ apiKey: env.anthropicApiKey })
  }

  async classifyAndStructure(
    text: string,
    _userContext?: string
  ): Promise<StructuredTicket> {
    // Sanitizar el input del usuario con delimitadores claros
    const sanitizedText = text.slice(0, 2000).trim()

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 30_000)

    let message: Awaited<ReturnType<typeof this.client.messages.create>>
    try {
      message = await this.client.messages.create(
        {
          model: 'claude-sonnet-4-6',
          max_tokens: 1024,
          system: SYSTEM_PROMPT,
          messages: [
            {
              role: 'user',
              content: `<user_input>\n${sanitizedText}\n</user_input>`,
            },
          ],
        },
        { signal: controller.signal }
      )
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error('AI_TIMEOUT: Claude no respondió en 30 segundos')
      }
      throw err
    } finally {
      clearTimeout(timer)
    }

    const rawContent = message.content[0]
    if (rawContent.type !== 'text') {
      throw new Error('Claude devolvió un tipo de contenido inesperado')
    }

    // Parsear y validar el JSON de la respuesta
    let parsed: unknown
    try {
      parsed = JSON.parse(rawContent.text.trim())
    } catch {
      throw new Error(
        `Claude devolvió JSON inválido: ${rawContent.text.slice(0, 200)}`
      )
    }

    const result = StructuredTicketSchema.safeParse(parsed)
    if (!result.success) {
      throw new Error(
        `Respuesta de Claude no coincide con el schema: ${result.error.message}`
      )
    }

    return result.data
  }
}
