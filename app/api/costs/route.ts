import { NextResponse } from 'next/server'
import { requireCapability } from '@/lib/auth/permissions'
import { getDOCostSnapshot } from '@/features/costs/server/do-billing'
import { upsertIntegrationStatus } from '@/lib/integrations/service'

export const dynamic = 'force-dynamic'

export async function GET() {
  const authz = await requireCapability('costs.read', undefined, {
    action: 'route.access',
    resource: '/api/costs',
  })
  if ('response' in authz) return authz.response

  try {
    const data = await getDOCostSnapshot()
    await upsertIntegrationStatus('do-billing', data.available ? 'active' : 'error', { reason: data.reason }).catch(() => {})
    return NextResponse.json({ data })
  } catch (err) {
    await upsertIntegrationStatus('do-billing', 'error', { reason: err instanceof Error ? err.message : 'unknown' }).catch(() => {})
    throw err
  }
}
