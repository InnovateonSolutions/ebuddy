import { createClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, getUserIdFromRequest, todayInTimezone } from '@/lib/utils'
import type { Ticket, UserPreferences } from '@/types/database'

const PAGE_SIZE = 20

export async function GET(request: Request) {
  const userId = getUserIdFromRequest(request)
  if (!userId) return apiError('No autorizado', 'UNAUTHORIZED', 401)

  const { searchParams } = new URL(request.url)
  const cursor = searchParams.get('cursor') // ISO datetime para cursor pagination

  try {
    const supabase = await createClient()

    const { data: prefs } = await supabase
      .from('user_preferences')
      .select('timezone')
      .eq('user_id', userId)
      .single() as { data: Pick<UserPreferences, 'timezone'> | null; error: unknown }

    const timezone = prefs?.timezone ?? 'America/Tijuana'
    const today = todayInTimezone(timezone)

    let query = supabase
      .from('tickets')
      .select('*')
      .eq('user_id', userId)
      .neq('status', 'DONE')
      .or(`due_date.gt.${today},due_date.is.null`)
      .order('due_date', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE)

    // Cursor pagination: traer tickets más antiguos que el cursor
    if (cursor) {
      query = query.lt('created_at', cursor)
    }

    const { data: tickets, error } = await query as { data: Ticket[] | null; error: unknown }

    if (error) {
      return apiError('Error al obtener tickets futuros', 'DATABASE_ERROR', 500)
    }

    const lastTicket = tickets?.[tickets.length - 1]
    const nextCursor =
      tickets && tickets.length === PAGE_SIZE
        ? lastTicket?.created_at ?? null
        : null

    return apiSuccess({ tickets: tickets ?? [], cursor: nextCursor })
  } catch {
    return apiError('Error interno', 'INTERNAL_ERROR', 500)
  }
}
