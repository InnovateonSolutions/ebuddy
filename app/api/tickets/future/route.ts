import { db } from '@/lib/db'
import { tickets, userPreferences } from '@/lib/db/schema'
import { eq, and, ne, or, gt, isNull, lt, asc, desc } from 'drizzle-orm'
import { apiSuccess, apiError, getUserIdFromRequest, todayInTimezone } from '@/lib/utils'

const PAGE_SIZE = 20

export async function GET(request: Request) {
  const userId = getUserIdFromRequest(request)
  if (!userId) return apiError('No autorizado', 'UNAUTHORIZED', 401)

  const { searchParams } = new URL(request.url)
  const cursor = searchParams.get('cursor') // ISO datetime para cursor pagination

  try {
    const prefs = await db
      .select({ timezone: userPreferences.timezone })
      .from(userPreferences)
      .where(eq(userPreferences.userId, userId))
      .limit(1)

    const timezone = prefs[0]?.timezone ?? 'America/Tijuana'
    const today = todayInTimezone(timezone)

    const conditions = and(
      eq(tickets.userId, userId),
      ne(tickets.status, 'DONE'),
      or(gt(tickets.dueDate, today), isNull(tickets.dueDate)),
      cursor ? lt(tickets.createdAt, new Date(cursor)) : undefined
    )

    const results = await db
      .select()
      .from(tickets)
      .where(conditions)
      .orderBy(asc(tickets.dueDate), desc(tickets.createdAt))
      .limit(PAGE_SIZE)

    const lastTicket = results[results.length - 1]
    const nextCursor =
      results.length === PAGE_SIZE
        ? lastTicket?.createdAt?.toISOString() ?? null
        : null

    return apiSuccess({ tickets: results, cursor: nextCursor })
  } catch {
    return apiError('Error interno', 'INTERNAL_ERROR', 500)
  }
}
