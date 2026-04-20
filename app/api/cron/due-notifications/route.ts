export const dynamic = 'force-dynamic'

import { db } from '@/lib/db'
import { tickets, users } from '@/lib/db/schema'
import { and, eq, ne } from 'drizzle-orm'
import { sendDueTicketsEmail } from '@/lib/notifications'
import { todayInTimezone } from '@/lib/utils'
import { apiSuccess, apiError, logEvent } from '@/lib/utils'

const CRON_SECRET = process.env.CRON_SECRET

export async function POST(request: Request) {
  if (!CRON_SECRET) {
    return apiError('CRON_SECRET no configurado', 'INTERNAL_ERROR', 500)
  }
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${CRON_SECRET}`) {
    return apiError('No autorizado', 'UNAUTHORIZED', 401)
  }

  const today = todayInTimezone('America/Tijuana')

  const dueToday = await db
    .select({
      ticket: tickets,
      userEmail: users.email,
    })
    .from(tickets)
    .innerJoin(users, eq(tickets.userId, users.id))
    .where(and(eq(tickets.dueDate, today), ne(tickets.status, 'DONE')))

  const byUser = new Map<string, { email: string; tickets: typeof tickets.$inferSelect[] }>()
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
      logEvent('email.error', { email, error: err instanceof Error ? err.message : String(err) })
    }
  }

  return apiSuccess({ sent, users: byUser.size })
}
