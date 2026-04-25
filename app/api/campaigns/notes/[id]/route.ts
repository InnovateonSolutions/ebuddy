import { requireAuthenticatedUserId } from '@/lib/auth/request'
import { updateCampaignNote } from '@/features/campaigns/server/service'
import { apiSuccess, apiError } from '@/lib/utils'
import { z } from 'zod'

const bodySchema = z.object({
  content: z.string().max(80_000),
})

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = requireAuthenticatedUserId(request)
  if ('response' in auth) return auth.response

  const { id } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return apiError('Body inválido', 'VALIDATION_ERROR', 400)
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) return apiError('Contenido inválido', 'VALIDATION_ERROR', 400)

  const updated = await updateCampaignNote(auth.userId, id, parsed.data.content)
  if (!updated) return apiError('Nota no encontrada', 'NOT_FOUND', 404)

  return apiSuccess({ id })
}
