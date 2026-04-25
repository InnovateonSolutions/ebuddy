export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth/config'
import { getAuthorizationContext } from '@/lib/auth/permissions'
import { listCampaigns, getLatestCampaignNotes } from '@/features/campaigns/server/service'
import { VaultViewer } from '@/features/campaigns/components/vault-viewer'

export default async function CampaignsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const authz = await getAuthorizationContext(session)
  if ('response' in authz) redirect('/login')

  const [campaigns, activeData] = await Promise.all([
    listCampaigns(authz.userId),
    getLatestCampaignNotes(authz.userId),
  ])

  return (
    <VaultViewer
      campaignName={activeData?.campaign.name ?? null}
      notes={activeData?.notes ?? []}
      campaigns={campaigns.map((c) => ({ ...c, updatedAt: c.updatedAt.toISOString() }))}
    />
  )
}
