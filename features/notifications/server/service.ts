import { and, eq, isNotNull, ne } from 'drizzle-orm'
import { db } from '@/lib/db'
import { tickets, users, userPreferences } from '@/lib/db/schema'
import { logEvent, todayInTimezone } from '@/lib/utils'
import { sendDueTicketsEmail } from '@/features/notifications/server/due-tickets-email'
import type { DueNotificationsResult, DueTicketsByUser } from '@/features/notifications/server/types'

const DEFAULT_TIMEZONE = 'America/Tijuana'

export async function runDueNotificationsCron(): Promise<DueNotificationsResult> {
  const candidates = await db
    .select({
      ticket: tickets,
      userEmail: users.email,
      timezone: userPreferences.timezone,
    })
    .from(tickets)
    .innerJoin(users, eq(tickets.userId, users.id))
    .leftJoin(userPreferences, eq(tickets.userId, userPreferences.userId))
    .where(and(isNotNull(tickets.dueDate), ne(tickets.status, 'DONE')))

  const byUser = new Map<string, DueTicketsByUser>()
  for (const row of candidates) {
    const timezone = row.timezone ?? DEFAULT_TIMEZONE
    const today = todayInTimezone(timezone)
    if (row.ticket.dueDate !== today) continue

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
