import { apiError } from '@/lib/utils'
import { requireAuthenticatedUserId } from '@/lib/auth/request'
import { getGoogleAuthUrl } from '@/features/calendar/server/google'

// Inicia el flujo OAuth2 con Google Calendar
export async function GET(request: Request) {
  const auth = requireAuthenticatedUserId(request)
  if ('response' in auth) return auth.response
  const { userId } = auth

  const authUrl = getGoogleAuthUrl(userId) // state = userId para verificar en callback
  return Response.redirect(authUrl)
}
