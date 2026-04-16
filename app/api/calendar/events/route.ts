import { loadCalendarEvents } from '@/lib/calendar'
import { apiSuccess, apiError, getUserIdFromRequest } from '@/lib/utils'
import type { CalendarEventsResponse } from '@/lib/types'

export async function GET(request: Request) {
  const userId = getUserIdFromRequest(request)
  if (!userId) return apiError('No autorizado', 'UNAUTHORIZED', 401)

  const { searchParams } = new URL(request.url)
  const daysAhead = Math.min(parseInt(searchParams.get('days') ?? '7'), 30)

  try {
    return apiSuccess<CalendarEventsResponse>(
      await loadCalendarEvents(userId, { daysAhead, throwOnAuthRequired: true })
    )
  } catch {
    return apiError('Error al obtener eventos del calendario', 'CALENDAR_ERROR', 500)
  }
}
