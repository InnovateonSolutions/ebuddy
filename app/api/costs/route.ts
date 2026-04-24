import { NextResponse } from 'next/server'
import { requireCapability } from '@/lib/auth/permissions'
import { getDOCostSnapshot } from '@/features/costs/server/do-billing'

export const dynamic = 'force-dynamic'

export async function GET() {
  const authz = await requireCapability('costs.read', undefined, {
    action: 'route.access',
    resource: '/api/costs',
  })
  if ('response' in authz) return authz.response

  const data = await getDOCostSnapshot()
  return NextResponse.json({ data })
}
