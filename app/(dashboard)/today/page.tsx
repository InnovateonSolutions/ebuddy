import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db'
import { tickets, userPreferences } from '@/lib/db/schema'
import { eq, and, ne } from 'drizzle-orm'
import { todayInTimezone } from '@/lib/utils'
import DayView from '@/components/day-view'
import CaptureForm from '@/components/capture-form'
import type { TodayResponse } from '@/types/api'

export const dynamic = 'force-dynamic'

export default async function TodayPage() {
  const session = await auth()
  if (!session?.user?.id) return null

  const userId = session.user.id

  const prefs = await db
    .select({ timezone: userPreferences.timezone })
    .from(userPreferences)
    .where(eq(userPreferences.userId, userId))
    .limit(1)

  const timezone = prefs[0]?.timezone ?? 'America/Tijuana'
  const today = todayInTimezone(timezone)

  const todayTickets = await db
    .select()
    .from(tickets)
    .where(
      and(
        eq(tickets.userId, userId),
        eq(tickets.dueDate, today),
        ne(tickets.status, 'DONE')
      )
    )
    .orderBy(tickets.createdAt)

  const todayData: TodayResponse = {
    tickets: {
      negocio: todayTickets.filter((t) => t.context === 'NEGOCIO'),
      personal: todayTickets.filter((t) => t.context === 'PERSONAL'),
    },
    calendar_events: [],
    date: today,
  }

  const dateLabel = new Intl.DateTimeFormat('es-MX', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: timezone,
  }).format(new Date())

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 capitalize">{dateLabel}</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          {(todayData.tickets.negocio.length + todayData.tickets.personal.length)} tareas pendientes hoy
        </p>
      </div>
      <CaptureForm />
      <DayView initialData={todayData} userId={userId} />
    </div>
  )
}
