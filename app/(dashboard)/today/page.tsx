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
      <div>
        <h1 className="text-2xl font-bold text-slate-900 capitalize">{dateLabel}</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          {todayData.tickets.negocio.length + todayData.tickets.personal.length} tareas pendientes hoy
        </p>
      </div>
      <DayView initialData={todayData} />
    </div>
  )
}
