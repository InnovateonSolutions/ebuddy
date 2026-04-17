import { z } from 'zod'
import type { CreateTicketInput, UpdateTicketInput } from '@/lib/types'

export const createTicketSchema = z.object({
  title: z.string().trim().min(1, 'El título es obligatorio').max(200),
  context: z.enum(['NEGOCIO', 'PERSONAL']),
  priority: z.enum(['ALTA', 'MEDIA', 'BAJA']).optional(),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  overview: z.string().trim().max(2000).optional(),
  what_to_do: z.string().trim().max(500).optional(),
}) satisfies z.ZodType<CreateTicketInput>

export const updateTicketSchema = z.object({
  status: z.enum(['PENDING', 'IN_PROGRESS', 'QA', 'DONE']).optional(),
  title: z.string().min(1).max(200).optional(),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  priority: z.enum(['ALTA', 'MEDIA', 'BAJA']).optional(),
}) satisfies z.ZodType<UpdateTicketInput>

export type UpdateTicketPayload = z.infer<typeof updateTicketSchema>

export function mapCreateTicketInputToDb(input: CreateTicketInput) {
  const title = input.title.trim()
  const overview = input.overview?.trim() ?? ''
  const whatToDo = input.what_to_do?.trim() || title

  return {
    title,
    context: input.context,
    priority: input.priority ?? 'MEDIA',
    dueDate: input.due_date ?? null,
    overview,
    whatToDo,
    nextSteps: [],
    status: 'PENDING' as const,
    rawInput: title,
  }
}

export function mapUpdateTicketInputToDb(input: UpdateTicketInput) {
  return {
    status: input.status,
    title: input.title,
    dueDate: input.due_date,
    priority: input.priority,
    updatedAt: new Date(),
  }
}
