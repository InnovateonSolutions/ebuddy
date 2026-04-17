import { db } from '@/lib/db'
import { tickets } from '@/lib/db/schema'
import { and, eq, lt } from 'drizzle-orm'
import { getUserIdFromRequest, apiSuccess, apiError } from '@/lib/utils'

export async function POST(request: Request) {
  const userId = getUserIdFromRequest(request)
  if (!userId) return apiError('No autorizado', 'UNAUTHORIZED', 401)

  // Archiva tickets DONE con más de 30 días de antigüedad
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 30)

  const archived = await db
    .update(tickets)
    .set({ archived: true, updatedAt: new Date() })
    .where(
      and(
        eq(tickets.userId, userId),
        eq(tickets.status, 'DONE'),
        lt(tickets.updatedAt, cutoff)
      )
    )
    .returning({ id: tickets.id })

  return apiSuccess({ archived: archived.length })
}
