import { createClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, getUserIdFromRequest } from '@/lib/utils'
import type { CalendarEventsResponse } from '@/types/api'
import type { CalendarToken } from '@/types/database'

export async function GET(request: Request) {
  const userId = getUserIdFromRequest(request)
  if (!userId) return apiError('No autorizado', 'UNAUTHORIZED', 401)

  const { searchParams } = new URL(request.url)
  const daysAhead = Math.min(parseInt(searchParams.get('days') ?? '7'), 30)

  try {
    const supabase = await createClient()

    const { data: tokens } = await supabase
      .from('calendar_tokens')
      .select('*')
      .eq('user_id', userId) as { data: CalendarToken[] | null; error: unknown }

    if (!tokens || tokens.length === 0) {
      const response: CalendarEventsResponse = {
        events: [],
        providers_connected: [],
      }
      return apiSuccess(response)
    }

    const [googleLib, microsoftLib] = await Promise.all([
      import('@/lib/calendar/google'),
      import('@/lib/calendar/microsoft'),
    ])

    const providers_connected = tokens.map((t) => t.provider) as ('GOOGLE' | 'MICROSOFT')[]

    const eventPromises = tokens.map(async (token) => {
      try {
        if (token.provider === 'GOOGLE') {
          const result = await googleLib.getGoogleCalendarEvents(token, daysAhead)
          if (result.newToken) {
            await supabase
              .from('calendar_tokens')
              .update(result.newToken as never)
              .eq('user_id', userId)
              .eq('provider', 'GOOGLE')
          }
          return result.events
        } else {
          const result = await microsoftLib.getMicrosoftCalendarEvents(token, daysAhead)
          if (result.newToken) {
            await supabase
              .from('calendar_tokens')
              .update(result.newToken as never)
              .eq('user_id', userId)
              .eq('provider', 'MICROSOFT')
          }
          return result.events
        }
      } catch (err) {
        const message = String(err)
        if (message === 'CALENDAR_AUTH_REQUIRED') {
          return apiError('Token de calendario inválido. Reconecta tu calendario.', 'CALENDAR_AUTH_REQUIRED', 401)
        }
        return []
      }
    })

    const results = await Promise.all(eventPromises)

    // Si algún proveedor devolvió un Response (error), propagarlo
    for (const r of results) {
      if (r instanceof Response) return r
    }

    const events = (results as Awaited<ReturnType<typeof googleLib.getGoogleCalendarEvents>>['events'][])
      .flat()
      .sort((a, b) => a.start.localeCompare(b.start))

    const response: CalendarEventsResponse = { events, providers_connected }
    return apiSuccess(response)
  } catch {
    return apiError('Error al obtener eventos del calendario', 'CALENDAR_ERROR', 500)
  }
}
