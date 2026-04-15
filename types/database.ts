// Re-exporta los tipos inferidos del schema Drizzle.
// Fuente de verdad: lib/db/schema.ts
export type {
  User,
  Ticket,
  NewTicket,
  UserPreferences,
  CalendarToken,
} from '@/lib/db/schema'

export type TicketContext = 'NEGOCIO' | 'PERSONAL'
export type TicketPriority = 'ALTA' | 'MEDIA' | 'BAJA'
export type TicketStatus = 'PENDING' | 'IN_PROGRESS' | 'DONE'
export type CalendarProvider = 'GOOGLE' | 'MICROSOFT'
