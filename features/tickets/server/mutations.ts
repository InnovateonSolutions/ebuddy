import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { tickets } from '@/lib/db/schema'
import { logEvent } from '@/lib/utils'
import { mapUpdateTicketInputToDb } from './contracts'
import type { UpdateTicketInput } from '@/lib/types'

export async function updateTicket(
  ticketId: string,
  userId: string,
  input: UpdateTicketInput
): Promise<typeof tickets.$inferSelect | null> {
  const [ticket] = await db
    .update(tickets)
    .set(mapUpdateTicketInputToDb(input))
    .where(and(eq(tickets.id, ticketId), eq(tickets.userId, userId)))
    .returning()

  if (!ticket) return null

  logEvent('ticket.updated', { userId, ticketId: ticket.id, fields: Object.keys(input).join(',') })
  return ticket
}

export async function deleteTicket(
  ticketId: string,
  userId: string
): Promise<boolean> {
  const [deleted] = await db
    .delete(tickets)
    .where(and(eq(tickets.id, ticketId), eq(tickets.userId, userId)))
    .returning()

  if (!deleted) return false

  logEvent('ticket.deleted', { userId, ticketId })
  return true
}
