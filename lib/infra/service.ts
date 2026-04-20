import { getApplicationMetrics } from '@/lib/infra/app-metrics'
import { getDigitalOceanDropletMetrics } from '@/lib/infra/do-metrics'
import { getPrometheusDiagnostics } from '@/lib/infra/prometheus-metrics'
import { createEmptyInfraSnapshot, type ApplicationMetrics, type DigitalOceanDropletMetrics, type InfraSnapshot, type PrometheusDiagnostics } from '@/lib/infra/types'

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
      droplet: { ...createEmptyInfraSnapshot().diagnostics.targets.droplet, reason },
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

export async function getInfraSnapshot(userId: string): Promise<InfraSnapshot> {
  const [dropletResult, diagnosticsResult, appResult] = await Promise.allSettled([
    getDigitalOceanDropletMetrics(),
    getPrometheusDiagnostics(),
    getApplicationMetrics(userId),
  ])

  return {
    droplet: dropletResult.status === 'fulfilled'
      ? dropletResult.value
      : fallbackDroplet(errorReason(dropletResult.reason)),
    diagnostics: diagnosticsResult.status === 'fulfilled'
      ? diagnosticsResult.value
      : fallbackDiagnostics(errorReason(diagnosticsResult.reason)),
    app: appResult.status === 'fulfilled'
      ? appResult.value
      : fallbackApp(errorReason(appResult.reason)),
    ts: new Date().toISOString(),
  }
}
