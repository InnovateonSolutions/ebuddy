import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'

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

async function checkDatabase(): Promise<ServiceCheck> {
  if (!process.env.DATABASE_URL) {
    return { id: 'database', name: 'Base de datos', status: 'outage', detail: 'No configurada' }
  }

  const t0 = Date.now()
  try {
    await db.execute(sql`SELECT 1`)
    return { id: 'database', name: 'Base de datos', status: 'operational', latencyMs: Date.now() - t0 }
  } catch {
    return { id: 'database', name: 'Base de datos', status: 'outage', latencyMs: Date.now() - t0, detail: 'Sin conexión' }
  }
}

function checkAI(): ServiceCheck {
  const hasAnthropic = Boolean(process.env.ANTHROPIC_API_KEY)
  const hasOpenAI = Boolean(process.env.OPENAI_API_KEY)
  if (hasAnthropic && hasOpenAI) {
    return { id: 'ai', name: 'IA · Claude + Whisper', status: 'operational' }
  }
  if (hasAnthropic || hasOpenAI) {
    return { id: 'ai', name: 'IA · Claude + Whisper', status: 'degraded', detail: 'Una clave de API faltante' }
  }
  return { id: 'ai', name: 'IA · Claude + Whisper', status: 'outage', detail: 'Claves no configuradas' }
}

function checkCalendar(): ServiceCheck {
  const hasGoogle = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
  const hasMicrosoft = Boolean(process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET)
  if (hasGoogle || hasMicrosoft) {
    return { id: 'calendar', name: 'Integraciones de calendario', status: 'operational' }
  }
  return {
    id: 'calendar',
    name: 'Integraciones de calendario',
    status: 'degraded',
    detail: 'OAuth no configurado (opcional)',
  }
}

export async function getSystemStatus(): Promise<SystemStatus> {
  const [dbStatus, aiStatus, calendarStatus] = await Promise.all([
    checkDatabase(),
    Promise.resolve(checkAI()),
    Promise.resolve(checkCalendar()),
  ])

  const services: ServiceCheck[] = [
    { id: 'app', name: 'Aplicación web', status: 'operational' },
    { id: 'api', name: 'API Routes', status: 'operational' },
    dbStatus,
    aiStatus,
    calendarStatus,
  ]

  const hasOutage = services.some((service) => service.status === 'outage')
  const hasDegraded = services.some((service) => service.status === 'degraded')

  return {
    overall: hasOutage ? 'outage' : hasDegraded ? 'degraded' : 'operational',
    checkedAt: new Date().toISOString(),
    services,
  }
}
