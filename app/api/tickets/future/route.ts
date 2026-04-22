import { getFutureTicketsPage, InvalidFutureCursorError } from '@/features/tickets/server/queries'
import { apiSuccess, apiError } from '@/lib/utils'
import { requireAuthenticatedUserId } from '@/lib/auth/request'

export async function GET(request: Request) {
  const auth = requireAuthenticatedUserId(request)
  if ('response' in auth) return auth.response
  const { userId } = auth

  const { searchParams } = new URL(request.url)
  const cursor = searchParams.get('cursor')

  try {
    return apiSuccess(await getFutureTicketsPage(userId, cursor))
  } catch (error) {
    if (error instanceof InvalidFutureCursorError) {
      return apiError('Cursor inválido', 'VALIDATION_ERROR', 400)
    }
    return apiError('Error interno', 'INTERNAL_ERROR', 500)
  }
}
