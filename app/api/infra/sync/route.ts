import { requireCapability } from '@/lib/auth/permissions'
import { getEliteminiServices } from '@/features/infra/server/elitemini-services'
import { upsertIntegrationStatus } from '@/lib/integrations/service'
import { apiSuccess } from '@/lib/utils'
import type { IntegrationStatus } from '@/lib/integrations/service'

export async function POST(request: Request) {
  const authz = await requireCapability('infra.write', request, {
    action: 'infra.sync',
    resource: '/api/infra/sync',
  })
  if ('response' in authz) return authz.response

  const services = await getEliteminiServices()

  const toStatus = (available: boolean, configured: boolean): IntegrationStatus =>
    !configured ? 'inactive' : available ? 'active' : 'error'

  await Promise.all([
    upsertIntegrationStatus('openclaw', toStatus(services.openclaw.available, services.openclaw.configured), {
      reason: services.openclaw.reason,
    }),
    upsertIntegrationStatus('ollama', toStatus(services.ollama.available, services.ollama.configured), {
      version: services.ollama.version,
      models: services.ollama.models,
      reason: services.ollama.reason,
    }),
  ])

  return apiSuccess({
    synced: ['openclaw', 'ollama'],
    openclaw: services.openclaw.available ? 'active' : 'error',
    ollama: services.ollama.available ? 'active' : 'error',
  })
}
