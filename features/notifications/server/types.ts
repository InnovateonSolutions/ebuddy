import type { Ticket } from '@/lib/types'

export interface DueTicketsByUser {
  email: string
  tickets: Ticket[]
}

export interface DueNotificationsResult {
  sent: number
  users: number
}
