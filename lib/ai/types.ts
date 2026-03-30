import type { TicketContext, TicketPriority } from '@/types/database'

// ============================================================
// Interfaces — permiten cambiar de proveedor sin tocar el resto
// ============================================================

export interface ITranscriptionService {
  transcribe(audioBuffer: Buffer, mimeType: string): Promise<string>
}

export interface IAIService {
  classifyAndStructure(
    text: string,
    userContext?: string
  ): Promise<StructuredTicket>
}

// ============================================================
// Ticket estructurado que devuelve la IA
// ============================================================

export interface StructuredTicket {
  context: TicketContext
  title: string
  overview: string
  what_to_do: string
  next_steps: string[]
  priority: TicketPriority
}

// Schema de validación para la respuesta JSON de Claude
export const STRUCTURED_TICKET_EXAMPLE: StructuredTicket = {
  context: 'NEGOCIO',
  title: 'Revisar propuesta con cliente XYZ',
  overview: 'Hay que revisar y ajustar la propuesta antes de la reunión del viernes.',
  what_to_do: 'Abrir el documento en Drive y actualizar la sección de precios',
  next_steps: [
    'Abrir propuesta en Google Drive',
    'Ajustar sección de precios según feedback',
    'Enviar al cliente antes del jueves 18:00',
  ],
  priority: 'ALTA',
}
