import type {
  User,
  Ticket,
  NewTicket,
  UserPreferences,
  CalendarToken,
} from '@/lib/db/schema'

export type {
  User,
  Ticket,
  NewTicket,
  UserPreferences,
  CalendarToken,
}

export type TicketContext = 'NEGOCIO' | 'PERSONAL'
export type TicketPriority = 'ALTA' | 'MEDIA' | 'BAJA'
export type TicketStatus = 'PENDING' | 'IN_PROGRESS' | 'QA' | 'DONE'
export type CalendarProvider = 'GOOGLE' | 'MICROSOFT'

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
  | 'AI_UPSTREAM_ERROR'
  | 'TRANSCRIPTION_ERROR'
  | 'CALENDAR_AUTH_REQUIRED'
  | 'CALENDAR_ERROR'
  | 'DATABASE_ERROR'
  | 'STEP_UP_REQUIRED'
  | 'INTERNAL_ERROR'

export interface CaptureTextInput {
  text: string
  due_date?: string
}

export interface TicketListResponse {
  tickets: Ticket[]
  cursor: string | null
}

export interface CalendarEvent {
  id: string
  title: string
  start: string
  end: string
  description?: string
  location?: string
  provider: CalendarProvider
  all_day: boolean
}

export interface TodayResponse {
  tickets: {
    negocio: Ticket[]
    personal: Ticket[]
  }
  calendar_events: CalendarEvent[]
  date: string
}

export interface FutureResponse {
  tickets: Ticket[]
  cursor: string | null
}

export interface UpdateTicketInput {
  status?: TicketStatus
  title?: string
  due_date?: string | null
  priority?: TicketPriority
  overview?: string
  what_to_do?: string
}

export interface CreateTicketInput {
  title: string
  context: TicketContext
  priority?: TicketPriority
  due_date?: string | null
  overview?: string
  what_to_do?: string
}

export interface CalendarEventsResponse {
  events: CalendarEvent[]
  providers_connected: CalendarProvider[]
}

export interface CalendarAuthUrlResponse {
  url: string
  provider: CalendarProvider
}
