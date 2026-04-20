import { auth } from '@/lib/auth/config'
import { apiSuccess, apiError } from '@/lib/utils'
import { getUserTimezone } from '@/features/tickets/server/queries'
import { getTicketStats } from '@/features/tickets/server/stats'

export async function GET() {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) return apiError('No autorizado', 'UNAUTHORIZED', 401)

  const timezone = await getUserTimezone(userId)
  return apiSuccess(await getTicketStats(userId, timezone))
}
