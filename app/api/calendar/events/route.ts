import { loadCalendarEvents } from '@/features/calendar/server'
import { apiSuccess, apiError } from '@/lib/utils'
import { requireAuthenticatedUserId } from '@/lib/auth/request'
import type { CalendarEventsResponse } from '@/lib/types'

export async function GET(request: Request) {
  const auth = requireAuthenticatedUserId(request)
  if ('response' in auth) return auth.response
  const { userId } = auth

  const { searchParams } = new URL(request.url)
  const parsedDays = Number.parseInt(searchParams.get('days') ?? '7', 10)
  const daysAhead = Number.isFinite(parsedDays)
    ? Math.min(Math.max(parsedDays, 1), 30)
    : 7

  try {
    return apiSuccess<CalendarEventsResponse>(
      await loadCalendarEvents(userId, { daysAhead, throwOnAuthRequired: true })
    )
  } catch {
    return apiError('Error al obtener eventos del calendario', 'CALENDAR_ERROR', 500)
  }
}
