import { loadCalendarEvents } from '@/features/calendar/server'
import { apiSuccess, apiError, getUserIdFromRequest } from '@/lib/utils'
import type { CalendarEventsResponse } from '@/lib/types'

export async function GET(request: Request) {
  const userId = getUserIdFromRequest(request)
  if (!userId) return apiError('No autorizado', 'UNAUTHORIZED', 401)

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
