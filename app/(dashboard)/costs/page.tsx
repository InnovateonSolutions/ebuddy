export const dynamic = 'force-dynamic'

import { auth } from '@/lib/auth/config'
import { getAuthorizationContext } from '@/lib/auth/permissions'
import { redirect } from 'next/navigation'
import { getDOCostSnapshot } from '@/features/costs/server/do-billing'
import { CostsDashboard } from '@/features/costs/components/costs-dashboard'

export default async function CostsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  const authz = await getAuthorizationContext(session)
  if ('response' in authz || !authz.capabilities.includes('costs.read')) redirect('/today')

  const initial = await getDOCostSnapshot()
  return <CostsDashboard initial={initial} />
}
