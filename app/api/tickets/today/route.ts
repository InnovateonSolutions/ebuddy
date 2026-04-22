import { loadCalendarEvents } from '@/features/calendar/server'
import { getTodayViewData } from '@/features/tickets/server/queries'
import { apiSuccess, apiError } from '@/lib/utils'
import { requireAuthenticatedUserId } from '@/lib/auth/request'

export async function GET(request: Request) {
  const auth = requireAuthenticatedUserId(request)
  if ('response' in auth) return auth.response
  const { userId } = auth

  try {
    const [{ data }, calendarData] = await Promise.all([
      getTodayViewData(userId),
      loadCalendarEvents(userId, { daysAhead: 1 }),
    ])

    return apiSuccess({ ...data, calendar_events: calendarData.events })
  } catch (err) {
    console.error('today.error', err instanceof Error ? err.message : String(err))
    return apiError('Error interno', 'INTERNAL_ERROR', 500)
  }
}
