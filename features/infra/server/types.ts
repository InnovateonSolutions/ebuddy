export interface ResourceUsage {
  pct: number
  used: number
  total: number
}

export interface DigitalOceanDropletMetrics {
  available: boolean
  source: 'digitalocean'
  reason?: string
  cpu?: number
  ram?: ResourceUsage
  disk?: ResourceUsage
  hostId?: string
  windowMinutes?: number
}

export interface DiagnosticsTarget {
  label: string
  available: boolean
  reason?: string
  cpu?: number
  ram?: ResourceUsage
  disk?: ResourceUsage
}

export interface PrometheusDiagnostics {
  configured: boolean
  available: boolean
  source: 'prometheus'
  reason?: string
  targets: {
    elitemini: DiagnosticsTarget
  }
}

export interface ApplicationMetrics {
  source: 'application'
  health: 'ok' | 'degraded'
  db: 'ok' | 'error'
  reason?: string
  activeTickets: number
  createdLast24h: number
  completedLast7d: number
  connectedCalendars: number
  lastCaptureAt: string | null
}

export interface InfraSnapshot {
  droplet: DigitalOceanDropletMetrics
  diagnostics: PrometheusDiagnostics
  app: ApplicationMetrics
  ts: string
}

function emptyTarget(label: string, reason: string): DiagnosticsTarget {
  return { label, available: false, reason }
}

export function createEmptyInfraSnapshot(): InfraSnapshot {
  return {
    droplet: {
      available: false,
      source: 'digitalocean',
      reason: 'DigitalOcean Monitoring no disponible',
    },
    diagnostics: {
      configured: false,
      available: false,
      source: 'prometheus',
      reason: 'Diagnóstico avanzado opcional no configurado',
      targets: {
        elitemini: emptyTarget('elitemini', 'No configurado'),
      },
    },
    app: {
      source: 'application',
      health: 'degraded',
      db: 'error',
      reason: 'No se pudo cargar el estado de la app',
      activeTickets: 0,
      createdLast24h: 0,
      completedLast7d: 0,
      connectedCalendars: 0,
      lastCaptureAt: null,
    },
    ts: new Date().toISOString(),
  }
}
