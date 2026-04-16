import { getFutureTicketsPage } from '@/lib/tickets'
import { apiSuccess, apiError, getUserIdFromRequest } from '@/lib/utils'

export async function GET(request: Request) {
  const userId = getUserIdFromRequest(request)
  if (!userId) return apiError('No autorizado', 'UNAUTHORIZED', 401)

  const { searchParams } = new URL(request.url)
  const cursor = searchParams.get('cursor') // ISO datetime para cursor pagination

  try {
    return apiSuccess(await getFutureTicketsPage(userId, cursor))
  } catch {
    return apiError('Error interno', 'INTERNAL_ERROR', 500)
  }
}
