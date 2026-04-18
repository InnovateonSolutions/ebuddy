export const dynamic = 'force-dynamic'

import { auth } from '@/lib/auth/config'
import { apiSuccess, apiError } from '@/lib/utils'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return apiError('No autorizado', 'UNAUTHORIZED', 401)

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
