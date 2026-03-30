import { createClient } from '@/lib/supabase/server'
import { todayInTimezone } from '@/lib/utils'
import DayView from '@/components/day-view'
import CaptureForm from '@/components/capture-form'
import type { TodayResponse } from '@/types/api'
import type { Ticket, UserPreferences } from '@/types/database'

export const dynamic = 'force-dynamic'

export default async function TodayPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: prefs } = await supabase
    .from('user_preferences')
    .select('timezone')
    .eq('user_id', user.id)
    .single() as { data: Pick<UserPreferences, 'timezone'> | null; error: unknown }

  const timezone = prefs?.timezone ?? 'America/Tijuana'
  const today = todayInTimezone(timezone)

  // Obtener tickets de hoy del servidor directamente
  const { data: tickets } = await supabase
    .from('tickets')
    .select('*')
    .eq('user_id', user.id)
    .eq('due_date', today)
    .neq('status', 'DONE')
    .order('created_at', { ascending: false }) as { data: Ticket[] | null; error: unknown }

  const todayData: TodayResponse = {
    tickets: {
      negocio: (tickets ?? []).filter((t) => t.context === 'NEGOCIO'),
      personal: (tickets ?? []).filter((t) => t.context === 'PERSONAL'),
    },
    calendar_events: [], // Los carga el cliente via SWR
    date: today,
  }

  // Formatear fecha legible
  const dateLabel = new Intl.DateTimeFormat('es-MX', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: timezone,
  }).format(new Date())

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 capitalize">{dateLabel}</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          {(todayData.tickets.negocio.length + todayData.tickets.personal.length)} tareas pendientes hoy
        </p>
      </div>

      {/* Captura */}
      <CaptureForm />

      {/* Vista del día */}
      <DayView initialData={todayData} userId={user.id} />
    </div>
  )
}
