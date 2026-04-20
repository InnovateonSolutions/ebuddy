export const dynamic = 'force-dynamic'

import { auth } from '@/lib/auth/config'
import { createEmptyInfraSnapshot } from '@/lib/infra/types'
import { getInfraSnapshot } from '@/lib/infra/service'
import { redirect } from 'next/navigation'
import { isOwner } from '@/lib/auth/owner'
import { InfraDashboard } from '@/components/infra-dashboard'

export default async function InfraPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  if (!isOwner(session.user.email)) redirect('/today')

  let initial = createEmptyInfraSnapshot()

  try {
    initial = await getInfraSnapshot(session.user.id)
  } catch { /* muestra sin datos — el cliente puede refrescar */ }

  return <InfraDashboard initial={initial} />
}
