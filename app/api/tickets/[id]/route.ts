import { apiSuccess, apiError } from '@/lib/utils'
import { requireCapability, requireStepUp } from '@/lib/auth/permissions'
import { updateTicketSchema } from '@/features/tickets/server/contracts'
import { updateTicket, deleteTicket } from '@/features/tickets/server/mutations'

const STEP_UP_MAX_AGE_SEC = 15 * 60

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authz = await requireCapability('tickets.write', request, {
    action: 'ticket.update',
    resource: '/api/tickets/[id]',
  })
  if ('response' in authz) return authz.response

  const { id } = await params

  let body: unknown
  try { body = await request.json() } catch {
    return apiError('Body inválido', 'VALIDATION_ERROR')
  }

  const parsed = updateTicketSchema.safeParse(body)
  if (!parsed.success) return apiError(parsed.error.errors[0].message, 'VALIDATION_ERROR')
  if (Object.keys(parsed.data).length === 0)
    return apiError('No se enviaron campos para actualizar', 'VALIDATION_ERROR')

  const ticket = await updateTicket(id, authz.userId, parsed.data)
  if (!ticket) return apiError('Ticket no encontrado', 'NOT_FOUND', 404)

  return apiSuccess(ticket)
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authz = await requireCapability('tickets.write', request, {
    action: 'ticket.delete',
    resource: '/api/tickets/[id]',
  })
  if ('response' in authz) return authz.response

  const stepUp = await requireStepUp(STEP_UP_MAX_AGE_SEC)
  if ('response' in stepUp) return stepUp.response

  const { id } = await params

  const deleted = await deleteTicket(id, authz.userId)
  if (!deleted) return apiError('Ticket no encontrado', 'NOT_FOUND', 404)

  return apiSuccess({ deleted: true })
}
