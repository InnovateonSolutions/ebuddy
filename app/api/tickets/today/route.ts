import { loadCalendarEvents } from '@/lib/calendar'
import { getTodayViewData } from '@/lib/tickets'
import { apiSuccess, apiError, getUserIdFromRequest } from '@/lib/utils'

export async function GET(request: Request) {
  const userId = getUserIdFromRequest(request)
  if (!userId) return apiError('No autorizado', 'UNAUTHORIZED', 401)

  try {
    const [{ data }, calendarData] = await Promise.all([
      getTodayViewData(userId),
      loadCalendarEvents(userId, { daysAhead: 1 }),
    ])

    return apiSuccess({ ...data, calendar_events: calendarData.events })
  } catch (err) {
    console.error('today.error', err)
    return apiError('Error interno', 'INTERNAL_ERROR', 500)
  }
}
