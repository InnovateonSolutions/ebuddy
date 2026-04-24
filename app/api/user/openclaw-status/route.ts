export const dynamic = 'force-dynamic'

import { apiSuccess } from '@/lib/utils'
import { requireCapability } from '@/lib/auth/permissions'

export async function GET(request: Request) {
  const authz = await requireCapability('gateway.read', request, {
    action: 'route.access',
    resource: '/api/user/openclaw-status',
  })
  if ('response' in authz) return authz.response

  const baseUrl = (process.env.OPENCLAW_BASE_URL ?? '').replace(/\/$/, '')
  const token = process.env.OPENCLAW_GATEWAY_TOKEN ?? ''

  if (!baseUrl) return apiSuccess({ available: false, version: null, baseUrl: '' })

  try {
    const res = await fetch(`${baseUrl}/v1/models`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(4000),
    })
    if (!res.ok) return apiSuccess({ available: false, version: null, baseUrl })
    return apiSuccess({ available: true, version: null, baseUrl })
  } catch {
    return apiSuccess({ available: false, version: null, baseUrl })
  }
}
