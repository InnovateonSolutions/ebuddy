export const dynamic = 'force-dynamic'

import { auth } from '@/lib/auth/config'
import { isOwner } from '@/lib/auth/owner'
import { redirect } from 'next/navigation'
import { getDOCostSnapshot } from '@/features/costs/server/do-billing'
import { CostsDashboard } from '@/features/costs/components/costs-dashboard'

export default async function CostsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  if (!isOwner(session.user.email)) redirect('/today')

  const initial = await getDOCostSnapshot()
  return <CostsDashboard initial={initial} />
}
