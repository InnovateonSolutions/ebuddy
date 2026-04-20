import { and, eq, gte } from 'drizzle-orm'
import { db } from '@/lib/db'
import { tickets } from '@/lib/db/schema'
import { todayInTimezone } from '@/lib/utils'

export interface TicketStats {
  total: number
  doneThisWeek: number
  doneLastWeek: number
  weekTrend: number | null
  byContext: { NEGOCIO: number; PERSONAL: number }
  byPriority: { ALTA: number; MEDIA: number; BAJA: number }
  byStatus: { PENDING: number; IN_PROGRESS: number; QA: number; DONE: number }
  streak: number
  doneLast30: number
}

export async function getTicketStats(userId: string, timezone: string): Promise<TicketStats> {
  const today = todayInTimezone(timezone)

  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)
  const twoWeeksAgo = new Date()
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)
  const monthAgo = new Date()
  monthAgo.setDate(monthAgo.getDate() - 30)

  const [allTickets, lastMonth] = await Promise.all([
    db.select().from(tickets).where(and(eq(tickets.userId, userId), eq(tickets.archived, false))),
    db.select().from(tickets).where(and(eq(tickets.userId, userId), gte(tickets.updatedAt, monthAgo))),
  ])

  const doneThisWeek = lastMonth.filter(
    (t) => t.status === 'DONE' && t.updatedAt >= weekAgo
  ).length

  const doneLastWeek = lastMonth.filter(
    (t) => t.status === 'DONE' && t.updatedAt >= twoWeeksAgo && t.updatedAt < weekAgo
  ).length

  const doneLast30 = lastMonth.filter((t) => t.status === 'DONE')
  const doneDays = new Set(doneLast30.map((t) => t.updatedAt.toISOString().slice(0, 10)))

  let streak = 0
  const d = new Date(today)
  while (doneDays.has(d.toISOString().slice(0, 10))) {
    streak++
    d.setDate(d.getDate() - 1)
  }

  return {
    total: allTickets.length,
    doneThisWeek,
    doneLastWeek,
    weekTrend: doneLastWeek > 0
      ? Math.round(((doneThisWeek - doneLastWeek) / doneLastWeek) * 100)
      : null,
    byContext: {
      NEGOCIO: allTickets.filter((t) => t.context === 'NEGOCIO').length,
      PERSONAL: allTickets.filter((t) => t.context === 'PERSONAL').length,
    },
    byPriority: {
      ALTA: allTickets.filter((t) => t.priority === 'ALTA').length,
      MEDIA: allTickets.filter((t) => t.priority === 'MEDIA').length,
      BAJA: allTickets.filter((t) => t.priority === 'BAJA').length,
    },
    byStatus: {
      PENDING: allTickets.filter((t) => t.status === 'PENDING').length,
      IN_PROGRESS: allTickets.filter((t) => t.status === 'IN_PROGRESS').length,
      QA: allTickets.filter((t) => t.status === 'QA').length,
      DONE: allTickets.filter((t) => t.status === 'DONE').length,
    },
    streak,
    doneLast30: doneLast30.length,
  }
}
