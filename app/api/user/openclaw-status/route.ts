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
    const res = await fetch(`${baseUrl}/api/version`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(4000),
    })
    if (!res.ok) return apiSuccess({ available: false, version: null, baseUrl })
    const data = await res.json() as { version?: string }
    return apiSuccess({ available: true, version: data.version ?? null, baseUrl })
  } catch {
    return apiSuccess({ available: false, version: null, baseUrl })
  }
}
