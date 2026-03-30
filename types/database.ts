export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type TicketContext = 'NEGOCIO' | 'PERSONAL'
export type TicketPriority = 'ALTA' | 'MEDIA' | 'BAJA'
export type TicketStatus = 'PENDING' | 'IN_PROGRESS' | 'DONE'
export type CalendarProvider = 'GOOGLE' | 'MICROSOFT'

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          display_name: string
          created_at: string
        }
        Insert: {
          id: string
          email: string
          display_name?: string
          created_at?: string
        }
        Update: {
          email?: string
          display_name?: string
        }
      }
      user_preferences: {
        Row: {
          user_id: string
          timezone: string
          work_start: string
          work_end: string
        }
        Insert: {
          user_id: string
          timezone?: string
          work_start?: string
          work_end?: string
        }
        Update: {
          timezone?: string
          work_start?: string
          work_end?: string
        }
      }
      tickets: {
        Row: {
          id: string
          user_id: string
          title: string
          context: TicketContext
          overview: string
          what_to_do: string
          next_steps: string[]
          priority: TicketPriority
          status: TicketStatus
          due_date: string | null
          raw_input: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          context: TicketContext
          overview?: string
          what_to_do?: string
          next_steps?: string[]
          priority?: TicketPriority
          status?: TicketStatus
          due_date?: string | null
          raw_input?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          title?: string
          context?: TicketContext
          overview?: string
          what_to_do?: string
          next_steps?: string[]
          priority?: TicketPriority
          status?: TicketStatus
          due_date?: string | null
        }
      }
      calendar_tokens: {
        Row: {
          user_id: string
          provider: CalendarProvider
          access_token: string
          refresh_token: string
          expires_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          provider: CalendarProvider
          access_token: string
          refresh_token: string
          expires_at: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          access_token?: string
          refresh_token?: string
          expires_at?: string
        }
      }
    }
  }
}

// Tipos de conveniencia
export type Ticket = Database['public']['Tables']['tickets']['Row']
export type TicketInsert = Database['public']['Tables']['tickets']['Insert']
export type TicketUpdate = Database['public']['Tables']['tickets']['Update']
export type User = Database['public']['Tables']['users']['Row']
export type UserPreferences = Database['public']['Tables']['user_preferences']['Row']
export type CalendarToken = Database['public']['Tables']['calendar_tokens']['Row']
