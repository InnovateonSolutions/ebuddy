export const dynamic = 'force-dynamic'

import { auth } from '@/lib/auth/config'
import { redirect } from 'next/navigation'
import { isOwner } from '@/lib/auth/owner'
import { InfraDashboard } from '@/components/infra-dashboard'

export default async function InfraPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  if (!isOwner(session.user.email)) redirect('/today')

  let initial = { droplet: { available: false }, elitemini: { available: false }, ts: new Date().toISOString() }

  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    const res = await fetch(`${baseUrl}/api/infra/metrics`, {
      headers: { Cookie: '' },
      signal: AbortSignal.timeout(5000),
    })
    if (res.ok) {
      const json = await res.json() as { data: typeof initial }
      initial = json.data
    }
  } catch { /* muestra sin datos — el cliente puede refrescar */ }

  return <InfraDashboard initial={initial} />
}
