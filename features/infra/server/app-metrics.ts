import { and, desc, eq, gte } from 'drizzle-orm'
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { calendarTokens, tickets } from '@/lib/db/schema'
import type { ApplicationMetrics } from '@/features/infra/server/types'

export async function getApplicationMetrics(userId: string): Promise<ApplicationMetrics> {
  try {
    await db.execute(sql`SELECT 1`)

    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const last7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    const [activeTickets, createdLast24h, updatedLast7d, latestTicket, linkedCalendars] = await Promise.all([
      db.select().from(tickets).where(and(eq(tickets.userId, userId), eq(tickets.archived, false))),
      db.select().from(tickets).where(and(eq(tickets.userId, userId), gte(tickets.createdAt, last24h))),
      db.select().from(tickets).where(and(eq(tickets.userId, userId), gte(tickets.updatedAt, last7d))),
      db.select({ createdAt: tickets.createdAt }).from(tickets).where(eq(tickets.userId, userId)).orderBy(desc(tickets.createdAt)).limit(1),
      db.select().from(calendarTokens).where(eq(calendarTokens.userId, userId)),
    ])

    return {
      source: 'application',
      health: 'ok',
      db: 'ok',
      activeTickets: activeTickets.length,
      createdLast24h: createdLast24h.length,
      completedLast7d: updatedLast7d.filter((ticket) => ticket.status === 'DONE').length,
      connectedCalendars: linkedCalendars.length,
      lastCaptureAt: latestTicket[0]?.createdAt.toISOString() ?? null,
    }
  } catch (error) {
    return {
      source: 'application',
      health: 'degraded',
      db: 'error',
      reason: error instanceof Error ? error.message : 'No se pudo leer el estado de la app',
      activeTickets: 0,
      createdLast24h: 0,
      completedLast7d: 0,
      connectedCalendars: 0,
      lastCaptureAt: null,
    }
  }
}
