export const dynamic = 'force-dynamic'

import { auth } from '@/lib/auth/config'
import { createEmptyInfraSnapshot } from '@/features/infra/server/types'
import { getInfraSnapshot } from '@/features/infra/server/service'
import { redirect } from 'next/navigation'
import { getAuthorizationContext } from '@/lib/auth/permissions'
import { InfraDashboard } from '@/features/infra/components/infra-dashboard'

export default async function InfraPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  const authz = await getAuthorizationContext(session)
  if ('response' in authz || !authz.capabilities.includes('infra.read')) redirect('/today')

  let initial = createEmptyInfraSnapshot()

  try {
    initial = await getInfraSnapshot(authz.userId)
  } catch { /* muestra sin datos — el cliente puede refrescar */ }

  return <InfraDashboard initial={initial} />
}
