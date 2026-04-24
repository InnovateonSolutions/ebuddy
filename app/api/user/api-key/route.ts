import { apiSuccess } from '@/lib/utils'
import { requireAuthenticatedUserId } from '@/lib/auth/request'
import { requireCapability, requireStepUp } from '@/lib/auth/permissions'
import { getApiKeyMeta, generateApiKey } from '@/features/settings/server/service'

const STEP_UP_MAX_AGE_SEC = 15 * 60

export async function GET(request: Request) {
  const auth = requireAuthenticatedUserId(request)
  if ('response' in auth) return auth.response
  const { userId } = auth

  return apiSuccess(await getApiKeyMeta(userId))
}

export async function POST(request: Request) {
  const capability = await requireCapability('secrets.manage', request, {
    action: 'api-key.generate',
    resource: '/api/user/api-key',
  })
  if ('response' in capability) return capability.response

  const stepUp = await requireStepUp(STEP_UP_MAX_AGE_SEC)
  if ('response' in stepUp) return stepUp.response

  return apiSuccess(await generateApiKey(capability.userId))
}
