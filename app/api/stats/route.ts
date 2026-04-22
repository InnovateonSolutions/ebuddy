import { apiSuccess, apiError } from '@/lib/utils'
import { requireAuthenticatedUserId } from '@/lib/auth/request'
import { getUserTimezone } from '@/features/tickets/server/queries'
import { getTicketStats } from '@/features/tickets/server/stats'

export async function GET(request: Request) {
  const auth = requireAuthenticatedUserId(request)
  if ('response' in auth) return auth.response
  const { userId } = auth

  const timezone = await getUserTimezone(userId)
  return apiSuccess(await getTicketStats(userId, timezone))
}
