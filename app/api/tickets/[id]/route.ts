import { apiSuccess, apiError } from '@/lib/utils'
import { requireAuthenticatedUserId } from '@/lib/auth/request'
import { updateTicketSchema } from '@/features/tickets/server/contracts'
import { updateTicket, deleteTicket } from '@/features/tickets/server/mutations'

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const auth = requireAuthenticatedUserId(request)
  if ('response' in auth) return auth.response
  const { userId } = auth

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
  const auth = requireAuthenticatedUserId(request)
  if ('response' in auth) return auth.response
  const { userId } = auth

  const deleted = await deleteTicket(params.id, userId)
  if (!deleted) return apiError('Ticket no encontrado', 'NOT_FOUND', 404)

  return apiSuccess({ deleted: true })
}
