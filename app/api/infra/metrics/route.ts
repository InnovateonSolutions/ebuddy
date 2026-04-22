export const dynamic = 'force-dynamic'

import { getInfraSnapshot } from '@/features/infra/server/service'
import { apiSuccess, apiError } from '@/lib/utils'
import { requireAuthenticatedUserId } from '@/lib/auth/request'

export async function GET(request: Request) {
  const auth = requireAuthenticatedUserId(request)
  if ('response' in auth) return auth.response

  const snapshot = await getInfraSnapshot(auth.userId)
  return apiSuccess(snapshot)
}
