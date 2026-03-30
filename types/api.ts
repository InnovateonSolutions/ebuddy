import type { Ticket, TicketContext, TicketStatus } from './database'

// ============================================================
// Respuesta estándar de la API
// ============================================================

export type ApiSuccess<T> = { success: true; data: T }
export type ApiError = { success: false; error: string; code: ApiErrorCode }
export type ApiResponse<T> = ApiSuccess<T> | ApiError

export type ApiErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'AI_TIMEOUT'
  | 'AI_INVALID_RESPONSE'
  | 'TRANSCRIPTION_ERROR'
  | 'CALENDAR_AUTH_REQUIRED'
  | 'CALENDAR_ERROR'
  | 'DATABASE_ERROR'
  | 'INTERNAL_ERROR'

// ============================================================
// Tickets
// ============================================================

export interface CaptureTextInput {
  text: string
  due_date?: string // ISO date string YYYY-MM-DD
}

// Para audio: FormData con campo "audio" (Blob/File)

export interface TicketResponse extends Ticket {}

export interface TicketListResponse {
  tickets: Ticket[]
  cursor: string | null // para paginación
}

export interface TodayResponse {
  tickets: {
    negocio: Ticket[]
    personal: Ticket[]
  }
  calendar_events: CalendarEvent[]
  date: string // YYYY-MM-DD
}

export interface FutureResponse {
  tickets: Ticket[]
  cursor: string | null
}

export interface UpdateTicketInput {
  status?: TicketStatus
  title?: string
  due_date?: string | null
  priority?: 'ALTA' | 'MEDIA' | 'BAJA'
}

// ============================================================
// Calendario
// ============================================================

export interface CalendarEvent {
  id: string
  title: string
  start: string // ISO datetime
  end: string   // ISO datetime
  description?: string
  location?: string
  provider: 'GOOGLE' | 'MICROSOFT'
  all_day: boolean
}

export interface CalendarEventsResponse {
  events: CalendarEvent[]
  providers_connected: ('GOOGLE' | 'MICROSOFT')[]
}

// ============================================================
// Auth de calendario (OAuth)
// ============================================================

export interface CalendarAuthUrlResponse {
  url: string
  provider: 'GOOGLE' | 'MICROSOFT'
}
