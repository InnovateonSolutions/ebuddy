import { z } from 'zod'
import { db } from '@/lib/db'
import { tickets } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { apiSuccess, apiError, getUserIdFromRequest, logEvent } from '@/lib/utils'

const UpdateSchema = z.object({
  status: z.enum(['PENDING', 'IN_PROGRESS', 'QA', 'DONE']).optional(),
  title: z.string().min(1).max(200).optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  priority: z.enum(['ALTA', 'MEDIA', 'BAJA']).optional(),
})

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const userId = getUserIdFromRequest(request)
  if (!userId) return apiError('No autorizado', 'UNAUTHORIZED', 401)

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return apiError('Body inválido', 'VALIDATION_ERROR')
  }

  const parsed = UpdateSchema.safeParse(body)
  if (!parsed.success) return apiError(parsed.error.errors[0].message, 'VALIDATION_ERROR')
  if (Object.keys(parsed.data).length === 0) return apiError('No se enviaron campos para actualizar', 'VALIDATION_ERROR')

  const [ticket] = await db
    .update(tickets)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(and(eq(tickets.id, params.id), eq(tickets.userId, userId)))
    .returning()

  if (!ticket) return apiError('Ticket no encontrado', 'NOT_FOUND', 404)

  logEvent('ticket.updated', {
    userId,
    ticketId: ticket.id,
    fields: Object.keys(parsed.data).join(','),
  })

  return apiSuccess(ticket)
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const userId = getUserIdFromRequest(request)
  if (!userId) return apiError('No autorizado', 'UNAUTHORIZED', 401)

  const [deleted] = await db
    .delete(tickets)
    .where(and(eq(tickets.id, params.id), eq(tickets.userId, userId)))
    .returning()

  if (!deleted) return apiError('Ticket no encontrado', 'NOT_FOUND', 404)

  logEvent('ticket.deleted', { userId, ticketId: params.id })
  return apiSuccess({ deleted: true })
}
