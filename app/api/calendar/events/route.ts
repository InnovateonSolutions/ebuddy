import { db } from '@/lib/db'
import { calendarTokens } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { apiSuccess, apiError, getUserIdFromRequest } from '@/lib/utils'
import type { CalendarEventsResponse } from '@/types/api'
import type { CalendarToken } from '@/lib/db/schema'

export async function GET(request: Request) {
  const userId = getUserIdFromRequest(request)
  if (!userId) return apiError('No autorizado', 'UNAUTHORIZED', 401)

  const { searchParams } = new URL(request.url)
  const daysAhead = Math.min(parseInt(searchParams.get('days') ?? '7'), 30)

  try {
    const tokens = await db
      .select()
      .from(calendarTokens)
      .where(eq(calendarTokens.userId, userId))

    if (tokens.length === 0) {
      return apiSuccess<CalendarEventsResponse>({ events: [], providers_connected: [] })
    }

    const [googleLib, microsoftLib] = await Promise.all([
      import('@/lib/calendar/google'),
      import('@/lib/calendar/microsoft'),
    ])

    const providers_connected = tokens.map((t) => t.provider) as ('GOOGLE' | 'MICROSOFT')[]

    const eventPromises = tokens.map(async (token: CalendarToken) => {
      try {
        if (token.provider === 'GOOGLE') {
          const result = await googleLib.getGoogleCalendarEvents(token, daysAhead)
          if (result.newToken) {
            await db
              .update(calendarTokens)
              .set(result.newToken)
              .where(and(eq(calendarTokens.userId, userId), eq(calendarTokens.provider, 'GOOGLE')))
          }
          return result.events
        } else {
          const result = await microsoftLib.getMicrosoftCalendarEvents(token, daysAhead)
          if (result.newToken) {
            await db
              .update(calendarTokens)
              .set(result.newToken)
              .where(and(eq(calendarTokens.userId, userId), eq(calendarTokens.provider, 'MICROSOFT')))
          }
          return result.events
        }
      } catch (err) {
        const message = String(err)
        if (message.includes('CALENDAR_AUTH_REQUIRED')) {
          throw new Error('CALENDAR_AUTH_REQUIRED')
        }
        return []
      }
    })

    const results = await Promise.allSettled(eventPromises)

    const events = results
      .filter((r): r is PromiseFulfilledResult<typeof googleLib.getGoogleCalendarEvents extends (...args: never[]) => Promise<{ events: infer E }> ? E : never[]> => r.status === 'fulfilled')
      .flatMap((r) => r.value as { start: string }[])
      .sort((a, b) => a.start.localeCompare(b.start))

    return apiSuccess<CalendarEventsResponse>({ events: events as CalendarEventsResponse['events'], providers_connected })
  } catch {
    return apiError('Error al obtener eventos del calendario', 'CALENDAR_ERROR', 500)
  }
}
