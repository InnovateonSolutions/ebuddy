export const dynamic = 'force-dynamic'

import { auth } from '@/lib/auth/config'
import { apiSuccess, apiError } from '@/lib/utils'
import { validatePreferences, updateUserPreferences } from '@/features/settings/server/service'

export async function PUT(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return apiError('No autorizado', 'UNAUTHORIZED', 401)

  const body = await req.json().catch(() => null)
  if (!body) return apiError('Cuerpo inválido', 'VALIDATION_ERROR', 400)

  const validationError = validatePreferences(body)
  if (validationError) return apiError(validationError.message, 'VALIDATION_ERROR', 400)

  const updated = await updateUserPreferences(session.user.id, body)
  return apiSuccess({ updated })
}
