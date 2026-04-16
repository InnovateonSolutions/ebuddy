import { db } from '@/lib/db'
import { tickets } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { apiSuccess, apiError, getUserIdFromRequest, logEvent } from '@/lib/utils'
import { mapUpdateTicketInputToDb, updateTicketSchema } from '@/lib/ticket-contracts'
import type { UpdateTicketInput } from '@/lib/types'

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

  const parsed = updateTicketSchema.safeParse(body)
  if (!parsed.success) return apiError(parsed.error.errors[0].message, 'VALIDATION_ERROR')
  if (Object.keys(parsed.data).length === 0) return apiError('No se enviaron campos para actualizar', 'VALIDATION_ERROR')

  const updateInput: UpdateTicketInput = parsed.data

  const [ticket] = await db
    .update(tickets)
    .set(mapUpdateTicketInputToDb(updateInput))
    .where(and(eq(tickets.id, params.id), eq(tickets.userId, userId)))
    .returning()

  if (!ticket) return apiError('Ticket no encontrado', 'NOT_FOUND', 404)

  logEvent('ticket.updated', {
    userId,
    ticketId: ticket.id,
    fields: Object.keys(updateInput).join(','),
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
