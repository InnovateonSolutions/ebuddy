import { z } from 'zod'
import type { UpdateTicketInput } from '@/lib/types'

export const updateTicketSchema = z.object({
  status: z.enum(['PENDING', 'IN_PROGRESS', 'QA', 'DONE']).optional(),
  title: z.string().min(1).max(200).optional(),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  priority: z.enum(['ALTA', 'MEDIA', 'BAJA']).optional(),
}) satisfies z.ZodType<UpdateTicketInput>

export type UpdateTicketPayload = z.infer<typeof updateTicketSchema>

export function mapUpdateTicketInputToDb(input: UpdateTicketInput) {
  return {
    status: input.status,
    title: input.title,
    dueDate: input.due_date,
    priority: input.priority,
    updatedAt: new Date(),
  }
}
