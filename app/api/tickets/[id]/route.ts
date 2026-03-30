import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, getUserIdFromRequest, logEvent } from '@/lib/utils'
import type { Ticket } from '@/types/database'

const UpdateSchema = z.object({
  status: z.enum(['PENDING', 'IN_PROGRESS', 'DONE']).optional(),
  title: z.string().min(1).max(200).optional(),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
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
  if (!parsed.success) {
    return apiError(parsed.error.errors[0].message, 'VALIDATION_ERROR')
  }

  if (Object.keys(parsed.data).length === 0) {
    return apiError('No se enviaron campos para actualizar', 'VALIDATION_ERROR')
  }

  const supabase = await createClient()

  // RLS garantiza que solo el dueño puede actualizar.
  // Igual verificamos explícitamente para devolver 404 en lugar de error genérico.
  const { data: ticket, error } = await supabase
    .from('tickets')
    .update(parsed.data as never)
    .eq('id', params.id)
    .eq('user_id', userId) // redundante con RLS pero explícito
    .select()
    .single() as { data: Ticket | null; error: unknown }

  if (error || !ticket) {
    return apiError('Ticket no encontrado', 'NOT_FOUND', 404)
  }

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

  const supabase = await createClient()

  const { error } = await supabase
    .from('tickets')
    .delete()
    .eq('id', params.id)
    .eq('user_id', userId)

  if (error) {
    return apiError('Ticket no encontrado', 'NOT_FOUND', 404)
  }

  logEvent('ticket.deleted', { userId, ticketId: params.id })
  return apiSuccess({ deleted: true })
}
