export const dynamic = 'force-dynamic'

import { apiSuccess, apiError } from '@/lib/utils'
import { runDueNotificationsCron } from '@/features/notifications/server/service'

const CRON_SECRET = process.env.CRON_SECRET

export async function POST(request: Request) {
  if (!CRON_SECRET) {
    return apiError('CRON_SECRET no configurado', 'INTERNAL_ERROR', 500)
  }
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${CRON_SECRET}`) {
    return apiError('No autorizado', 'UNAUTHORIZED', 401)
  }

  return apiSuccess(await runDueNotificationsCron())
}
