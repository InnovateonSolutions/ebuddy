export const dynamic = 'force-dynamic'

import { apiSuccess, apiError } from '@/lib/utils'
import { requireAuthenticatedUserId } from '@/lib/auth/request'

export async function GET(request: Request) {
  const auth = requireAuthenticatedUserId(request)
  if ('response' in auth) return auth.response

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
