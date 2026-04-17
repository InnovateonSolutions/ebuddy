import { auth } from '@/lib/auth/config'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { tickets } from '@/lib/db/schema'
import { and, eq, gte } from 'drizzle-orm'
import { getUserTimezone } from '@/lib/tickets'
import { todayInTimezone } from '@/lib/utils'
import { TrendingUp, TrendingDown, Minus, Flame, CheckCircle2, LayoutGrid } from 'lucide-react'
import { cn } from '@/lib/utils'

export default async function StatsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  const userId = session.user.id

  const timezone = await getUserTimezone(userId)
  const today = todayInTimezone(timezone)

  const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7)
  const twoWeeksAgo = new Date(); twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)
  const monthAgo = new Date(); monthAgo.setDate(monthAgo.getDate() - 30)

  const [all, lastMonth] = await Promise.all([
    db.select().from(tickets).where(and(eq(tickets.userId, userId), eq(tickets.archived, false))),
    db.select().from(tickets).where(and(eq(tickets.userId, userId), gte(tickets.updatedAt, monthAgo))),
  ])

  const doneThisWeek = lastMonth.filter((t) => t.status === 'DONE' && t.updatedAt >= weekAgo).length
  const doneLastWeek = lastMonth.filter((t) => t.status === 'DONE' && t.updatedAt >= twoWeeksAgo && t.updatedAt < weekAgo).length
  const trend = doneLastWeek > 0 ? Math.round(((doneThisWeek - doneLastWeek) / doneLastWeek) * 100) : null

  const byStatus = {
    PENDING: all.filter((t) => t.status === 'PENDING').length,
    IN_PROGRESS: all.filter((t) => t.status === 'IN_PROGRESS').length,
    QA: all.filter((t) => t.status === 'QA').length,
    DONE: all.filter((t) => t.status === 'DONE').length,
  }

  const doneDays = new Set(lastMonth.filter((t) => t.status === 'DONE').map((t) => t.updatedAt.toISOString().slice(0, 10)))
  let streak = 0
  const d = new Date(today)
  while (doneDays.has(d.toISOString().slice(0, 10))) { streak++; d.setDate(d.getDate() - 1) }

  const TrendIcon = trend === null ? Minus : trend > 0 ? TrendingUp : TrendingDown
  const trendColor = trend === null ? 'text-slate-400' : trend > 0 ? 'text-emerald-600' : 'text-red-500'

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Estadísticas</h1>
        <p className="text-slate-500 text-sm mt-0.5">Últimos 30 días · {timezone}</p>
      </div>

      {/* Highlight cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Completados esta semana" value={doneThisWeek}>
          <div className={cn('flex items-center gap-1 text-xs font-medium mt-1', trendColor)}>
            <TrendIcon size={12} />
            {trend !== null ? `${Math.abs(trend)}% vs semana pasada` : 'Sin datos previos'}
          </div>
        </StatCard>
        <StatCard label="Racha actual" value={`${streak}d`}>
          <div className="flex items-center gap-1 text-xs text-amber-500 mt-1">
            <Flame size={12} /> {streak > 0 ? 'días seguidos' : 'Completa hoy'}
          </div>
        </StatCard>
        <StatCard label="Total activos" value={all.length - byStatus.DONE} />
        <StatCard label="Completados totales" value={byStatus.DONE} />
      </div>

      {/* Estado del backlog */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
          <LayoutGrid size={13} /> Estado del backlog
        </h2>
        <div className="space-y-3">
          {[
            { label: 'Por hacer', count: byStatus.PENDING, color: 'bg-slate-300' },
            { label: 'En progreso', count: byStatus.IN_PROGRESS, color: 'bg-blue-400' },
            { label: 'En revisión', count: byStatus.QA, color: 'bg-violet-400' },
            { label: 'Completados', count: byStatus.DONE, color: 'bg-emerald-400' },
          ].map(({ label, count, color }) => {
            const pct = all.length > 0 ? Math.round((count / all.length) * 100) : 0
            return (
              <div key={label} className="flex items-center gap-3">
                <span className="text-xs text-slate-600 w-24 flex-shrink-0">{label}</span>
                <div className="flex-1 bg-slate-100 rounded-full h-2">
                  <div className={cn('h-2 rounded-full transition-all', color)} style={{ width: `${pct}%` }} />
                </div>
                <span className="text-xs text-slate-400 w-8 text-right">{count}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Distribución */}
      <div className="grid sm:grid-cols-2 gap-4">
        <DistCard title="Por contexto" rows={[
          { label: 'Negocio', count: all.filter((t) => t.context === 'NEGOCIO').length, color: 'bg-blue-400' },
          { label: 'Personal', count: all.filter((t) => t.context === 'PERSONAL').length, color: 'bg-emerald-400' },
        ]} total={all.length} />
        <DistCard title="Por prioridad" rows={[
          { label: 'Alta', count: all.filter((t) => t.priority === 'ALTA').length, color: 'bg-red-400' },
          { label: 'Media', count: all.filter((t) => t.priority === 'MEDIA').length, color: 'bg-amber-400' },
          { label: 'Baja', count: all.filter((t) => t.priority === 'BAJA').length, color: 'bg-slate-300' },
        ]} total={all.length} />
      </div>
    </div>
  )
}

function StatCard({ label, value, children }: { label: string; value: string | number; children?: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4">
      <p className="text-xs text-slate-400 leading-tight">{label}</p>
      <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
      {children}
    </div>
  )
}

function DistCard({ title, rows, total }: { title: string; rows: { label: string; count: number; color: string }[]; total: number }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">{title}</p>
      <div className="space-y-2">
        {rows.map(({ label, count, color }) => {
          const pct = total > 0 ? Math.round((count / total) * 100) : 0
          return (
            <div key={label} className="flex items-center gap-2">
              <div className={cn('w-2 h-2 rounded-full flex-shrink-0', color)} />
              <span className="text-xs text-slate-600 flex-1">{label}</span>
              <span className="text-xs font-medium text-slate-700">{count}</span>
              <span className="text-xs text-slate-400 w-8 text-right">{pct}%</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
