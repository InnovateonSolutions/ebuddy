import { apiSuccess, apiError } from '@/lib/utils'
import { requireAuthenticatedUserId } from '@/lib/auth/request'
import { getApiKeyMeta, generateApiKey } from '@/features/settings/server/service'

export async function GET(request: Request) {
  const auth = requireAuthenticatedUserId(request)
  if ('response' in auth) return auth.response
  const { userId } = auth

  return apiSuccess(await getApiKeyMeta(userId))
}

export async function POST(request: Request) {
  const auth = requireAuthenticatedUserId(request)
  if ('response' in auth) return auth.response
  const { userId } = auth

  return apiSuccess(await generateApiKey(userId))
}
