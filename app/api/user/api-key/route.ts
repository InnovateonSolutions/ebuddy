import { apiSuccess, apiError, getUserIdFromRequest } from '@/lib/utils'
import { getApiKeyMeta, generateApiKey } from '@/features/settings/server/service'

export async function GET(request: Request) {
  const userId = getUserIdFromRequest(request)
  if (!userId) return apiError('No autorizado', 'UNAUTHORIZED', 401)

  return apiSuccess(await getApiKeyMeta(userId))
}

export async function POST(request: Request) {
  const userId = getUserIdFromRequest(request)
  if (!userId) return apiError('No autorizado', 'UNAUTHORIZED', 401)

  return apiSuccess(await generateApiKey(userId))
}
