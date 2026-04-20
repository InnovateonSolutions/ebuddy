import { and, eq, ne } from 'drizzle-orm'
import { db } from '@/lib/db'
import { tickets, users } from '@/lib/db/schema'
import { logEvent, todayInTimezone } from '@/lib/utils'
import { sendDueTicketsEmail } from '@/features/notifications/server/due-tickets-email'
import type { DueNotificationsResult, DueTicketsByUser } from '@/features/notifications/server/types'

export async function runDueNotificationsCron(): Promise<DueNotificationsResult> {
  const today = todayInTimezone('America/Tijuana')

  const dueToday = await db
    .select({
      ticket: tickets,
      userEmail: users.email,
    })
    .from(tickets)
    .innerJoin(users, eq(tickets.userId, users.id))
    .where(and(eq(tickets.dueDate, today), ne(tickets.status, 'DONE')))

  const byUser = new Map<string, DueTicketsByUser>()
  for (const row of dueToday) {
    if (!byUser.has(row.ticket.userId)) {
      byUser.set(row.ticket.userId, { email: row.userEmail, tickets: [] })
    }
    byUser.get(row.ticket.userId)!.tickets.push(row.ticket)
  }

  let sent = 0
  for (const { email, tickets: userTickets } of Array.from(byUser.values())) {
    try {
      await sendDueTicketsEmail(email, userTickets)
      sent++
    } catch (err) {
      logEvent('email.error', {
        email,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  return { sent, users: byUser.size }
}
