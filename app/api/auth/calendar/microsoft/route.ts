import { getUserIdFromRequest, apiError } from '@/lib/utils'
import { getMicrosoftAuthUrl } from '@/features/calendar/server/microsoft'

export async function GET(request: Request) {
  const userId = getUserIdFromRequest(request)
  if (!userId) return apiError('No autorizado', 'UNAUTHORIZED', 401)

  const authUrl = getMicrosoftAuthUrl(userId)
  return Response.redirect(authUrl)
}
