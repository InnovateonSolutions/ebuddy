export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth/config'
import { getAuthorizationContext } from '@/lib/auth/permissions'
import { listCampaigns, getLatestCampaignNotes } from '@/features/campaigns/server/service'
import { CampaignVaultUploader } from '@/features/campaigns/components/campaign-vault-uploader'
import { CampaignNotesList } from '@/features/campaigns/components/campaign-notes-list'

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
    <div className="max-w-2xl space-y-6">
      <section className="dashboard-hero">
        <p className="dashboard-kicker">Campañas DnD</p>
        <h1 className="dashboard-title">Mesa y canon</h1>
        <p className="dashboard-subtitle">
          Importa tu vault de Obsidian y usa tus notas como memoria viva para preparar sesiones, NPCs y escenas.
        </p>
      </section>

      <CampaignVaultUploader initialCampaigns={campaigns.map((c) => ({ ...c, updatedAt: c.updatedAt.toISOString() }))} />

      {activeData && (
        <CampaignNotesList
          campaignName={activeData.campaign.name}
          notes={activeData.notes}
        />
      )}
    </div>
  )
}
