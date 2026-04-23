export const dynamic = 'force-dynamic'

import { getInfraSnapshot } from '@/features/infra/server/service'
import { apiSuccess, apiError } from '@/lib/utils'
import { requireAuthenticatedUserId } from '@/lib/auth/request'
import { auth } from '@/lib/auth/config'
import { isOwner } from '@/lib/auth/owner'

export async function GET(request: Request) {
  const requestAuth = requireAuthenticatedUserId(request)
  if ('response' in requestAuth) return requestAuth.response

  const session = await auth()
  if (!isOwner(session?.user?.email)) {
    return apiError('Prohibido', 'FORBIDDEN', 403)
  }

  const snapshot = await getInfraSnapshot(requestAuth.userId)
  return apiSuccess(snapshot)
}
