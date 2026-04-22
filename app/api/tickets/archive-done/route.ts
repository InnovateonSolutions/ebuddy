import { db } from '@/lib/db'
import { tickets } from '@/lib/db/schema'
import { and, eq, lt } from 'drizzle-orm'
import { apiSuccess, apiError } from '@/lib/utils'
import { requireAuthenticatedUserId } from '@/lib/auth/request'

export async function POST(request: Request) {
  const auth = requireAuthenticatedUserId(request)
  if ('response' in auth) return auth.response
  const { userId } = auth

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
