import { apiSuccess, apiError, getUserIdFromRequest } from '@/lib/utils'
import { updateTicketSchema } from '@/features/tickets/server/contracts'
import { updateTicket, deleteTicket } from '@/features/tickets/server/mutations'

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const userId = getUserIdFromRequest(request)
  if (!userId) return apiError('No autorizado', 'UNAUTHORIZED', 401)

  let body: unknown
  try { body = await request.json() } catch {
    return apiError('Body inválido', 'VALIDATION_ERROR')
  }

  const parsed = updateTicketSchema.safeParse(body)
  if (!parsed.success) return apiError(parsed.error.errors[0].message, 'VALIDATION_ERROR')
  if (Object.keys(parsed.data).length === 0)
    return apiError('No se enviaron campos para actualizar', 'VALIDATION_ERROR')

  const ticket = await updateTicket(params.id, userId, parsed.data)
  if (!ticket) return apiError('Ticket no encontrado', 'NOT_FOUND', 404)

  return apiSuccess(ticket)
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const userId = getUserIdFromRequest(request)
  if (!userId) return apiError('No autorizado', 'UNAUTHORIZED', 401)

  const deleted = await deleteTicket(params.id, userId)
  if (!deleted) return apiError('Ticket no encontrado', 'NOT_FOUND', 404)

  return apiSuccess({ deleted: true })
}
