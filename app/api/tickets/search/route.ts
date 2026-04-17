import { getUserIdFromRequest, apiSuccess, apiError } from '@/lib/utils'
import { searchTickets } from '@/lib/tickets'

export async function GET(request: Request) {
  const userId = getUserIdFromRequest(request)
  if (!userId) return apiError('No autorizado', 'UNAUTHORIZED', 401)

  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim() ?? ''

  if (q.length < 2) return apiSuccess([])

  const results = await searchTickets(userId, q)
  return apiSuccess(results)
}
