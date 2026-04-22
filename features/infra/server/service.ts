import { getApplicationMetrics } from '@/features/infra/server/app-metrics'
import { getDigitalOceanDropletMetrics } from '@/features/infra/server/do-metrics'
import { getEliteminiServices } from '@/features/infra/server/elitemini-services'
import { getPrometheusDiagnostics } from '@/features/infra/server/prometheus-metrics'
import { createEmptyInfraSnapshot, type ApplicationMetrics, type DigitalOceanDropletMetrics, type EliteminiServices, type InfraSnapshot, type PrometheusDiagnostics } from '@/features/infra/server/types'

function errorReason(error: unknown) {
  return error instanceof Error ? error.message : 'Error inesperado'
}

function fallbackDroplet(reason: string): DigitalOceanDropletMetrics {
  return {
    ...createEmptyInfraSnapshot().droplet,
    reason,
  }
}

function fallbackDiagnostics(reason: string): PrometheusDiagnostics {
  return {
    ...createEmptyInfraSnapshot().diagnostics,
    reason,
    targets: {
      elitemini: { ...createEmptyInfraSnapshot().diagnostics.targets.elitemini, reason },
    },
  }
}

function fallbackApp(reason: string): ApplicationMetrics {
  return {
    ...createEmptyInfraSnapshot().app,
    reason,
  }
}

function fallbackServices(reason: string): EliteminiServices {
  return {
    ...createEmptyInfraSnapshot().services,
    openclaw: {
      ...createEmptyInfraSnapshot().services.openclaw,
      reason,
    },
    ollama: {
      ...createEmptyInfraSnapshot().services.ollama,
      reason,
    },
  }
}

export async function getInfraSnapshot(userId: string): Promise<InfraSnapshot> {
  const [dropletResult, diagnosticsResult, servicesResult, appResult] = await Promise.allSettled([
    getDigitalOceanDropletMetrics(),
    getPrometheusDiagnostics(),
    getEliteminiServices(),
    getApplicationMetrics(userId),
  ])

  return {
    droplet: dropletResult.status === 'fulfilled'
      ? dropletResult.value
      : fallbackDroplet(errorReason(dropletResult.reason)),
    diagnostics: diagnosticsResult.status === 'fulfilled'
      ? diagnosticsResult.value
      : fallbackDiagnostics(errorReason(diagnosticsResult.reason)),
    services: servicesResult.status === 'fulfilled'
      ? servicesResult.value
      : fallbackServices(errorReason(servicesResult.reason)),
    app: appResult.status === 'fulfilled'
      ? appResult.value
      : fallbackApp(errorReason(appResult.reason)),
    ts: new Date().toISOString(),
  }
}
