export const dynamic = 'force-dynamic'

import { getInfraSnapshot } from '@/features/infra/server/service'
import { apiSuccess } from '@/lib/utils'
import { requireCapability } from '@/lib/auth/permissions'

export async function GET(request: Request) {
  const authz = await requireCapability('infra.read', request, {
    action: 'route.access',
    resource: '/api/infra/metrics',
  })
  if ('response' in authz) return authz.response

  const snapshot = await getInfraSnapshot(authz.userId)
  return apiSuccess(snapshot)
}
