import { createClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, getUserIdFromRequest, todayInTimezone } from '@/lib/utils'
import type { TodayResponse } from '@/types/api'
import type { Ticket, UserPreferences, CalendarToken } from '@/types/database'

export async function GET(request: Request) {
  const userId = getUserIdFromRequest(request)
  if (!userId) return apiError('No autorizado', 'UNAUTHORIZED', 401)

  try {
    const supabase = await createClient()

    // Obtener timezone del usuario
    const { data: prefs } = await supabase
      .from('user_preferences')
      .select('timezone')
      .eq('user_id', userId)
      .single() as { data: Pick<UserPreferences, 'timezone'> | null; error: unknown }

    const timezone = prefs?.timezone ?? 'America/Tijuana'
    const today = todayInTimezone(timezone)

    // Consultar tickets de hoy y eventos de calendario en paralelo
    const [ticketsResult, calendarResult] = await Promise.all([
      (supabase
        .from('tickets')
        .select('*')
        .eq('user_id', userId)
        .eq('due_date', today)
        .neq('status', 'DONE')
        .order('priority', { ascending: true }) // ALTA primero (A < B < M en orden lexicográfico con enum es otro asunto)
        .order('created_at', { ascending: false }) as unknown) as Promise<{ data: Ticket[] | null; error: unknown }>,
      fetchCalendarEvents(userId, supabase),
    ])

    if (ticketsResult.error) {
      return apiError('Error al obtener tickets', 'DATABASE_ERROR', 500)
    }

    const tickets = ticketsResult.data ?? []

    const response: TodayResponse = {
      tickets: {
        negocio: tickets.filter((t: Ticket) => t.context === 'NEGOCIO'),
        personal: tickets.filter((t: Ticket) => t.context === 'PERSONAL'),
      },
      calendar_events: calendarResult,
      date: today,
    }

    return apiSuccess(response)
  } catch (err) {
    console.error('today.error', err)
    return apiError('Error interno', 'INTERNAL_ERROR', 500)
  }
}

async function fetchCalendarEvents(userId: string, supabase: Awaited<ReturnType<typeof createClient>>) {
  try {
    // Importar dinámicamente para no bloquear si no hay tokens configurados
    const [googleLib, microsoftLib] = await Promise.all([
      import('@/lib/calendar/google'),
      import('@/lib/calendar/microsoft'),
    ])

    const { data: tokens } = await supabase
      .from('calendar_tokens')
      .select('*')
      .eq('user_id', userId) as { data: CalendarToken[] | null; error: unknown }

    if (!tokens || tokens.length === 0) return []

    const eventPromises = tokens.map(async (token) => {
      try {
        if (token.provider === 'GOOGLE') {
          const result = await googleLib.getGoogleCalendarEvents(token, 1)
          // Actualizar token si fue renovado
          if (result.newToken) {
            await supabase
              .from('calendar_tokens')
              .update(result.newToken as never)
              .eq('user_id', userId)
              .eq('provider', 'GOOGLE')
          }
          return result.events
        } else {
          const result = await microsoftLib.getMicrosoftCalendarEvents(token, 1)
          if (result.newToken) {
            await supabase
              .from('calendar_tokens')
              .update(result.newToken as never)
              .eq('user_id', userId)
              .eq('provider', 'MICROSOFT')
          }
          return result.events
        }
      } catch {
        // Si un proveedor falla, no romper el resto
        return []
      }
    })

    const results = await Promise.all(eventPromises)
    return results.flat().sort((a, b) => a.start.localeCompare(b.start))
  } catch {
    return []
  }
}
