export const dynamic = 'force-dynamic'

import { apiSuccess, apiError } from '@/lib/utils'
import { requireAuthenticatedUserId } from '@/lib/auth/request'
import { UserPreferencesValidationError, validatePreferences, updateUserPreferences } from '@/features/settings/server/service'

export async function PUT(req: Request) {
  const auth = requireAuthenticatedUserId(req)
  if ('response' in auth) return auth.response

  const body = await req.json().catch(() => null)
  if (!body) return apiError('Cuerpo inválido', 'VALIDATION_ERROR', 400)

  const validationError = validatePreferences(body)
  if (validationError) return apiError(validationError.message, 'VALIDATION_ERROR', 400)

  try {
    const updated = await updateUserPreferences(auth.userId, body)
    return apiSuccess({ updated })
  } catch (error) {
    if (error instanceof UserPreferencesValidationError) {
      return apiError(error.message, 'VALIDATION_ERROR', 400)
    }
    return apiError('Error interno del servidor', 'INTERNAL_ERROR', 500)
  }
}
