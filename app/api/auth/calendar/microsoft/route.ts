import { apiError } from '@/lib/utils'
import { requireAuthenticatedUserId } from '@/lib/auth/request'
import { getMicrosoftAuthUrl } from '@/features/calendar/server/microsoft'

export async function GET(request: Request) {
  const auth = requireAuthenticatedUserId(request)
  if ('response' in auth) return auth.response
  const { userId } = auth

  const authUrl = getMicrosoftAuthUrl(userId)
  return Response.redirect(authUrl)
}
