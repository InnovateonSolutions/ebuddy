import { getUserIdFromRequest, apiError } from '@/lib/utils'
import { getGoogleAuthUrl } from '@/lib/calendar/google'

// Inicia el flujo OAuth2 con Google Calendar
export async function GET(request: Request) {
  const userId = getUserIdFromRequest(request)
  if (!userId) return apiError('No autorizado', 'UNAUTHORIZED', 401)

  const authUrl = getGoogleAuthUrl(userId) // state = userId para verificar en callback
  return Response.redirect(authUrl)
}
