export const dynamic = 'force-dynamic'

import { auth } from '@/lib/auth/config'
import { getInfraSnapshot } from '@/lib/infra/service'
import { apiSuccess, apiError } from '@/lib/utils'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return apiError('No autorizado', 'UNAUTHORIZED', 401)

  const snapshot = await getInfraSnapshot(session.user.id)
  return apiSuccess(snapshot)
}
