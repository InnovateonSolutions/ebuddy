import { db } from '@/lib/db'
import { tickets, userPreferences, calendarTokens } from '@/lib/db/schema'
import { eq, and, ne } from 'drizzle-orm'
import { apiSuccess, apiError, getUserIdFromRequest, todayInTimezone } from '@/lib/utils'
import type { TodayResponse } from '@/types/api'
import type { CalendarToken } from '@/lib/db/schema'

export async function GET(request: Request) {
  const userId = getUserIdFromRequest(request)
  if (!userId) return apiError('No autorizado', 'UNAUTHORIZED', 401)

  try {
    const prefs = await db
      .select({ timezone: userPreferences.timezone })
      .from(userPreferences)
      .where(eq(userPreferences.userId, userId))
      .limit(1)

    const timezone = prefs[0]?.timezone ?? 'America/Tijuana'
    const today = todayInTimezone(timezone)

    const [todayTickets, calendarEvents] = await Promise.all([
      db
        .select()
        .from(tickets)
        .where(
          and(
            eq(tickets.userId, userId),
            eq(tickets.dueDate, today),
            ne(tickets.status, 'DONE')
          )
        )
        .orderBy(tickets.priority, tickets.createdAt),
      fetchCalendarEvents(userId),
    ])

    const response: TodayResponse = {
      tickets: {
        negocio: todayTickets.filter((t) => t.context === 'NEGOCIO'),
        personal: todayTickets.filter((t) => t.context === 'PERSONAL'),
      },
      calendar_events: calendarEvents,
      date: today,
    }

    return apiSuccess(response)
  } catch (err) {
    console.error('today.error', err)
    return apiError('Error interno', 'INTERNAL_ERROR', 500)
  }
}

async function fetchCalendarEvents(userId: string) {
  try {
    const [googleLib, microsoftLib] = await Promise.all([
      import('@/lib/calendar/google'),
      import('@/lib/calendar/microsoft'),
    ])

    const tokens = await db
      .select()
      .from(calendarTokens)
      .where(eq(calendarTokens.userId, userId))

    if (tokens.length === 0) return []

    const eventPromises = tokens.map(async (token: CalendarToken) => {
      try {
        if (token.provider === 'GOOGLE') {
          const result = await googleLib.getGoogleCalendarEvents(token, 1)
          if (result.newToken) {
            await db
              .update(calendarTokens)
              .set(result.newToken)
              .where(
                and(
                  eq(calendarTokens.userId, userId),
                  eq(calendarTokens.provider, 'GOOGLE')
                )
              )
          }
          return result.events
        } else {
          const result = await microsoftLib.getMicrosoftCalendarEvents(token, 1)
          if (result.newToken) {
            await db
              .update(calendarTokens)
              .set(result.newToken)
              .where(
                and(
                  eq(calendarTokens.userId, userId),
                  eq(calendarTokens.provider, 'MICROSOFT')
                )
              )
          }
          return result.events
        }
      } catch {
        return []
      }
    })

    const results = await Promise.all(eventPromises)
    return results.flat().sort((a, b) => a.start.localeCompare(b.start))
  } catch {
    return []
  }
}
