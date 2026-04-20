export type ServiceStatus = 'operational' | 'degraded' | 'outage'

export interface ServiceCheck {
  id: string
  name: string
  status: ServiceStatus
  latencyMs?: number
  detail?: string
}

export interface SystemStatus {
  overall: ServiceStatus
  checkedAt: string
  services: ServiceCheck[]
}
