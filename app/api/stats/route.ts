import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db'
import { tickets } from '@/lib/db/schema'
import { and, eq, gte, ne } from 'drizzle-orm'
import { apiSuccess, apiError, todayInTimezone } from '@/lib/utils'
import { getUserTimezone } from '@/features/tickets/server/queries'

export async function GET() {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) return apiError('No autorizado', 'UNAUTHORIZED', 401)

  const timezone = await getUserTimezone(userId)
  const today = todayInTimezone(timezone)

  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)
  const twoWeeksAgo = new Date()
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)
  const monthAgo = new Date()
  monthAgo.setDate(monthAgo.getDate() - 30)

  const [allTickets, lastMonth] = await Promise.all([
    db.select().from(tickets).where(and(eq(tickets.userId, userId), eq(tickets.archived, false))),
    db.select().from(tickets).where(
      and(eq(tickets.userId, userId), gte(tickets.updatedAt, monthAgo))
    ),
  ])

  const doneThisWeek = lastMonth.filter(
    (t) => t.status === 'DONE' && t.updatedAt >= weekAgo
  ).length

  const doneLastWeek = lastMonth.filter(
    (t) => t.status === 'DONE' && t.updatedAt >= twoWeeksAgo && t.updatedAt < weekAgo
  ).length

  const byContext = {
    NEGOCIO: allTickets.filter((t) => t.context === 'NEGOCIO').length,
    PERSONAL: allTickets.filter((t) => t.context === 'PERSONAL').length,
  }

  const byPriority = {
    ALTA: allTickets.filter((t) => t.priority === 'ALTA').length,
    MEDIA: allTickets.filter((t) => t.priority === 'MEDIA').length,
    BAJA: allTickets.filter((t) => t.priority === 'BAJA').length,
  }

  const byStatus = {
    PENDING: allTickets.filter((t) => t.status === 'PENDING').length,
    IN_PROGRESS: allTickets.filter((t) => t.status === 'IN_PROGRESS').length,
    QA: allTickets.filter((t) => t.status === 'QA').length,
    DONE: allTickets.filter((t) => t.status === 'DONE').length,
  }

  const doneLast30 = lastMonth.filter((t) => t.status === 'DONE')
  const doneDays = new Set(doneLast30.map((t) => t.updatedAt.toISOString().slice(0, 10)))

  // Streak: días consecutivos hasta hoy con al menos 1 DONE
  let streak = 0
  const d = new Date(today)
  while (doneDays.has(d.toISOString().slice(0, 10))) {
    streak++
    d.setDate(d.getDate() - 1)
  }

  return apiSuccess({
    total: allTickets.length,
    doneThisWeek,
    doneLastWeek,
    weekTrend: doneLastWeek > 0
      ? Math.round(((doneThisWeek - doneLastWeek) / doneLastWeek) * 100)
      : null,
    byContext,
    byPriority,
    byStatus,
    streak,
    doneLast30: doneLast30.length,
  })
}
