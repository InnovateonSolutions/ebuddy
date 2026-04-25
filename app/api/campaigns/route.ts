import { requireCapability } from '@/lib/auth/permissions'
import { apiError, apiSuccess } from '@/lib/utils'
import { CampaignImportError, importCampaignVault, listCampaigns } from '@/features/campaigns/server/service'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const authz = await requireCapability('gateway.execute', request, {
    action: 'campaigns.list',
    resource: '/api/campaigns',
  })
  if ('response' in authz) return authz.response

  const rows = await listCampaigns(authz.userId)
  return apiSuccess({ campaigns: rows })
}

export async function POST(request: Request) {
  const authz = await requireCapability('gateway.execute', request, {
    action: 'campaigns.import',
    resource: '/api/campaigns',
  })
  if ('response' in authz) return authz.response

  const body = await request.json().catch(() => null)
  if (!body) return apiError('Body inválido', 'VALIDATION_ERROR', 400)

  try {
    const result = await importCampaignVault(authz.userId, body)
    return apiSuccess(result)
  } catch (error) {
    if (error instanceof CampaignImportError) {
      return apiError(error.message, 'VALIDATION_ERROR', 400)
    }
    return apiError('Error interno del servidor', 'INTERNAL_ERROR', 500)
  }
}
