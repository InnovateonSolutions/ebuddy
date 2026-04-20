import { db } from '@/lib/db'
import { tickets } from '@/lib/db/schema'
import { apiError, apiSuccess, getUserIdFromRequest, logEvent } from '@/lib/utils'
import { createTicketSchema, mapCreateTicketInputToDb } from '@/features/tickets/server/contracts'
import type { CreateTicketInput } from '@/lib/types'

export async function POST(request: Request) {
  const userId = getUserIdFromRequest(request)
  if (!userId) return apiError('No autorizado', 'UNAUTHORIZED', 401)

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return apiError('Body inválido', 'VALIDATION_ERROR')
  }

  const parsed = createTicketSchema.safeParse(body)
  if (!parsed.success) return apiError(parsed.error.errors[0].message, 'VALIDATION_ERROR')

  const input: CreateTicketInput = parsed.data

  const [ticket] = await db
    .insert(tickets)
    .values({
      userId,
      ...mapCreateTicketInputToDb(input),
    })
    .returning()

  logEvent('ticket.created_manual', {
    userId,
    ticketId: ticket.id,
    context: ticket.context,
    priority: ticket.priority,
  })

  return apiSuccess(ticket)
}
