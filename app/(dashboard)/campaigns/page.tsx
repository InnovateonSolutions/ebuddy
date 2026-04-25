export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth/config'
import { getAuthorizationContext } from '@/lib/auth/permissions'
import { listCampaigns } from '@/features/campaigns/server/service'
import { CampaignVaultUploader } from '@/features/campaigns/components/campaign-vault-uploader'

export default async function CampaignsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const authz = await getAuthorizationContext(session)
  if ('response' in authz) redirect('/login')

  const campaigns = (await listCampaigns(authz.userId)).map((campaign) => ({
    ...campaign,
    updatedAt: campaign.updatedAt.toISOString(),
  }))

  return (
    <div className="max-w-2xl space-y-6">
      <section className="dashboard-hero">
        <p className="dashboard-kicker">Campañas DnD</p>
        <h1 className="dashboard-title">Mesa y canon</h1>
        <p className="dashboard-subtitle">
          Importa tu vault de Obsidian y usa tus notas como memoria viva para preparar sesiones, NPCs y escenas.
        </p>
      </section>

      <CampaignVaultUploader initialCampaigns={campaigns} />
    </div>
  )
}
