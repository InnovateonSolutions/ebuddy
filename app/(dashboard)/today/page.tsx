import { auth } from '@/lib/auth/config'
import DayView from '@/features/tickets/components/day-view'
import { getTodayViewData } from '@/features/tickets/server/queries'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function TodayPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const userId = session.user.id
  const { timezone, data: todayData } = await getTodayViewData(userId)

  const dateLabel = new Intl.DateTimeFormat('es-MX', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: timezone,
  }).format(new Date())

  return (
    <div className="space-y-6">
      <section className="dashboard-hero">
        <p className="dashboard-kicker">Hoy</p>
        <h1 className="dashboard-title capitalize">{dateLabel}</h1>
        <p className="dashboard-subtitle">
          {todayData.tickets.negocio.length + todayData.tickets.personal.length} tareas activas para hoy. Captura rapido, decide que va primero y ten el dia completo a la vista.
        </p>
      </section>
      <DayView initialData={todayData} />
    </div>
  )
}
