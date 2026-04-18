export const dynamic = 'force-dynamic'

import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db'
import { userPreferences } from '@/lib/db/schema'
import { apiSuccess, apiError } from '@/lib/utils'

const VALID_TIMEZONES = [
  'America/Tijuana',
  'America/Los_Angeles',
  'America/Denver',
  'America/Chicago',
  'America/Mexico_City',
  'America/Monterrey',
  'America/New_York',
  'America/Bogota',
  'America/Lima',
  'America/Santiago',
  'America/Argentina/Buenos_Aires',
  'Europe/Madrid',
  'UTC',
]

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/

export async function PUT(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return apiError('No autorizado', 'UNAUTHORIZED', 401)

  const body = await req.json().catch(() => null)
  if (!body) return apiError('Cuerpo inválido', 'VALIDATION_ERROR', 400)

  const { timezone, workStart, workEnd } = body

  if (timezone !== undefined && !VALID_TIMEZONES.includes(timezone))
    return apiError('Zona horaria inválida', 'VALIDATION_ERROR', 400)

  if (workStart !== undefined && !TIME_RE.test(workStart))
    return apiError('workStart inválido (HH:MM)', 'VALIDATION_ERROR', 400)

  if (workEnd !== undefined && !TIME_RE.test(workEnd))
    return apiError('workEnd inválido (HH:MM)', 'VALIDATION_ERROR', 400)

  const updates: Record<string, string> = {}
  if (timezone) updates.timezone = timezone
  if (workStart) updates.workStart = workStart
  if (workEnd) updates.workEnd = workEnd

  await db
    .insert(userPreferences)
    .values({ userId: session.user.id, ...updates })
    .onConflictDoUpdate({ target: userPreferences.userId, set: updates })

  return apiSuccess({ updated: Object.keys(updates) })
}
