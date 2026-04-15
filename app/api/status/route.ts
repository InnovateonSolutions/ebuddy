// Status endpoint — comprueba servicios en tiempo real
// Público: no requiere autenticación

import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'

export interface ServiceStatus {
  id: string
  name: string
  status: 'operational' | 'degraded' | 'outage'
  latencyMs?: number
  detail?: string
}

export interface StatusResponse {
  overall: 'operational' | 'degraded' | 'outage'
  checkedAt: string
  services: ServiceStatus[]
}

async function checkDatabase(): Promise<ServiceStatus> {
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

function checkAI(): ServiceStatus {
  const hasAnthropic = Boolean(process.env.ANTHROPIC_API_KEY)
  const hasOpenAI = Boolean(process.env.OPENAI_API_KEY)
  if (hasAnthropic && hasOpenAI) {
    return { id: 'ai', name: 'IA (Claude + Whisper)', status: 'operational' }
  }
  if (hasAnthropic || hasOpenAI) {
    return { id: 'ai', name: 'IA (Claude + Whisper)', status: 'degraded', detail: 'Una clave de API faltante' }
  }
  return { id: 'ai', name: 'IA (Claude + Whisper)', status: 'outage', detail: 'Claves de API no configuradas' }
}

function checkCalendar(): ServiceStatus {
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

export async function GET() {
  const [dbStatus, aiStatus, calendarStatus] = await Promise.all([
    checkDatabase(),
    Promise.resolve(checkAI()),
    Promise.resolve(checkCalendar()),
  ])

  const appStatus: ServiceStatus = { id: 'app', name: 'Aplicación web', status: 'operational' }
  const apiStatus: ServiceStatus = { id: 'api', name: 'API Routes', status: 'operational' }

  const services: ServiceStatus[] = [appStatus, apiStatus, dbStatus, aiStatus, calendarStatus]

  const hasOutage = services.some((s) => s.status === 'outage')
  const hasDegraded = services.some((s) => s.status === 'degraded')
  const overall: StatusResponse['overall'] = hasOutage ? 'outage' : hasDegraded ? 'degraded' : 'operational'

  const body: StatusResponse = {
    overall,
    checkedAt: new Date().toISOString(),
    services,
  }

  return Response.json(body, { status: 200 })
}
