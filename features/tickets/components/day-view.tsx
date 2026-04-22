'use client'

import { useState, useCallback, useEffect } from 'react'
import { Briefcase, User, Calendar, RefreshCw, Clock, MapPin, CheckSquare } from 'lucide-react'
import TicketCard from '@/features/tickets/components/ticket-card'
import CaptureForm from '@/features/tickets/components/capture-form'
import ManualTicketForm from '@/features/tickets/components/manual-ticket-form'
import type {
  ApiResponse,
  CalendarEvent,
  CalendarEventsResponse,
  Ticket,
  TodayResponse,
} from '@/lib/types'

interface DayViewProps {
  initialData: TodayResponse
}

export default function DayView({ initialData }: DayViewProps) {
  const [negocioTickets, setNegocioTickets] = useState<Ticket[]>(
    initialData.tickets.negocio
  )
  const [personalTickets, setPersonalTickets] = useState<Ticket[]>(
    initialData.tickets.personal
  )
  const [calendarEvents, setCalendarEvents] = useState(initialData.calendar_events)
  const [calendarLoading, setCalendarLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'negocio' | 'personal'>('negocio')

  useEffect(() => {
    fetch('/api/calendar/events?days=1')
      .then((r) => r.json())
      .then((json: ApiResponse<CalendarEventsResponse>) => {
        if (json.success) setCalendarEvents(json.data.events)
      })
      .catch(() => {})
      .finally(() => setCalendarLoading(false))
  }, [])

  const handleInsert = useCallback(
    (ticket: Ticket) => {
      const isToday = ticket.dueDate === initialData.date || !ticket.dueDate
      if (!isToday) return

      if (ticket.context === 'NEGOCIO') {
        setNegocioTickets((prev) => [ticket, ...prev])
      } else {
        setPersonalTickets((prev) => [ticket, ...prev])
      }
    },
    [initialData.date]
  )

  const handleUpdate = useCallback((ticket: Ticket) => {
    const update = (prev: Ticket[]) =>
      prev.map((t) => (t.id === ticket.id ? ticket : t))
    setNegocioTickets(update)
    setPersonalTickets(update)
  }, [])

  const handleDelete = useCallback((id: string) => {
    setNegocioTickets((prev) => prev.filter((t) => t.id !== id))
    setPersonalTickets((prev) => prev.filter((t) => t.id !== id))
  }, [])

  function handleTicketCreated(ticket: Ticket) {
    const isToday = ticket.dueDate === initialData.date || !ticket.dueDate
    if (!isToday) return
    handleInsert(ticket)
  }

  const totalToday = negocioTickets.length + personalTickets.length
  const doneToday = [...negocioTickets, ...personalTickets].filter(
    (t) => t.status === 'DONE'
  ).length
  const progressPct = totalToday > 0 ? Math.round((doneToday / totalToday) * 100) : 0
  const activeTickets = totalToday - doneToday

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="dashboard-stat-card">
          <p className="text-xs font-medium text-slate-500">Activas</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">{activeTickets}</p>
          <p className="mt-1 text-xs text-slate-400">Pendientes de mover hoy</p>
        </div>
        <div className="dashboard-stat-card">
          <p className="text-xs font-medium text-slate-500">Completadas</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">{doneToday}</p>
          <p className="mt-1 text-xs text-slate-400">Cerradas durante la jornada</p>
        </div>
        <div className="dashboard-stat-card">
          <p className="text-xs font-medium text-slate-500">Agenda</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">{calendarEvents.length}</p>
          <p className="mt-1 text-xs text-slate-400">Eventos visibles para hoy</p>
        </div>
        <div className="dashboard-stat-card">
          <p className="text-xs font-medium text-slate-500">Progreso</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">{progressPct}%</p>
          <p className="mt-1 text-xs text-slate-400">Avance del dia</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <ManualTicketForm onTicketCreated={handleTicketCreated} />
          <CaptureForm onTicketCreated={handleTicketCreated} />

          <div className="dashboard-panel p-2">
            <div className="px-2 pb-2 pt-1">
              <p className="dashboard-section-title">Tickets del dia</p>
              <p className="mt-1 text-sm text-slate-500">
                Alterna entre contexto de negocio y personal sin perder foco.
              </p>
            </div>

            <div className="flex items-center gap-1 rounded-2xl bg-slate-100 p-1">
              <TabButton
                active={activeTab === 'negocio'}
                onClick={() => setActiveTab('negocio')}
                icon={<Briefcase size={14} />}
                label="Negocio"
                count={negocioTickets.length}
              />
              <TabButton
                active={activeTab === 'personal'}
                onClick={() => setActiveTab('personal')}
                icon={<User size={14} />}
                label="Personal"
                count={personalTickets.length}
              />
            </div>

            <div className="mt-3 px-2 pb-2">
              {activeTab === 'negocio' ? (
                <TicketList
                  tickets={negocioTickets}
                  emptyLabel="Sin tareas de negocio para hoy"
                  onUpdate={handleUpdate}
                  onDelete={handleDelete}
                />
              ) : (
                <TicketList
                  tickets={personalTickets}
                  emptyLabel="Sin tareas personales para hoy"
                  onUpdate={handleUpdate}
                  onDelete={handleDelete}
                />
              )}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="dashboard-panel overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <Calendar size={14} />
                <span>Agenda del dia</span>
              </div>
              {calendarLoading && (
                <RefreshCw size={13} className="animate-spin text-slate-400" />
              )}
            </div>

            <div className="p-2">
              {!calendarLoading && calendarEvents.length === 0 ? (
                <p className="py-8 text-center text-xs text-slate-400">Sin eventos hoy</p>
              ) : (
                calendarEvents.map((event) => (
                  <CalendarAgendaItem key={event.id} event={event} />
                ))
              )}
            </div>
          </div>

          <div className="dashboard-panel p-4">
            <p className="dashboard-section-title mb-3">Progreso de hoy</p>
            <div className="mb-2 flex items-end justify-between">
              <p className="text-2xl font-bold text-slate-900">
                {doneToday}
                <span className="text-base font-normal text-slate-400">/{totalToday}</span>
              </p>
              <p className="text-xs font-semibold text-slate-500">{progressPct}%</p>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-blue-500 transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-slate-400">
              {doneToday === totalToday && totalToday > 0
                ? 'Todo listo por hoy.'
                : `${totalToday - doneToday} ${totalToday - doneToday === 1 ? 'tarea pendiente' : 'tareas pendientes'}`}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function CalendarAgendaItem({ event }: { event: CalendarEvent }) {
  const start = new Date(event.start)
  const end = new Date(event.end)
  const timeLabel = event.all_day
    ? 'Todo el dia'
    : `${formatTime(start)} - ${formatTime(end)}`

  return (
    <div className="flex gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-slate-50">
      <div
        className={`w-0.5 rounded-full flex-shrink-0 self-stretch ${
          event.provider === 'GOOGLE' ? 'bg-blue-400' : 'bg-indigo-400'
        }`}
      />

      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-medium text-slate-800">{event.title}</p>
        <div className="mt-0.5 flex items-center gap-3">
          <span className="flex items-center gap-1 text-xs text-slate-500">
            <Clock size={11} />
            {timeLabel}
          </span>
          {event.location && (
            <span className="flex max-w-[200px] items-center gap-1 truncate text-xs text-slate-400">
              <MapPin size={11} />
              {event.location}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

function formatTime(date: Date): string {
  return new Intl.DateTimeFormat('es-MX', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date)
}

function TabButton({
  active,
  onClick,
  icon,
  label,
  count,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
  count: number
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-all ${
        active
          ? 'bg-white text-slate-900 shadow-sm shadow-slate-200'
          : 'text-slate-500 hover:text-slate-700'
      }`}
    >
      {icon}
      {label}
      <span
        className={`rounded-full px-1.5 py-0.5 text-xs ${
          active ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-500'
        }`}
      >
        {count}
      </span>
    </button>
  )
}

function TicketList({
  tickets,
  emptyLabel,
  onUpdate,
  onDelete,
}: {
  tickets: Ticket[]
  emptyLabel: string
  onUpdate: (t: Ticket) => void
  onDelete: (id: string) => void
}) {
  if (tickets.length === 0) {
    return (
      <div className="dashboard-panel-muted py-12 text-center text-slate-400">
        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-white">
          <CheckSquare size={18} className="text-slate-300" />
        </div>
        <p className="text-sm font-medium text-slate-500">{emptyLabel}</p>
        <p className="mt-1 text-xs text-slate-400">
          Usa el formulario de arriba para capturar o crear algo nuevo
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {tickets.map((ticket) => (
        <TicketCard
          key={ticket.id}
          ticket={ticket}
          onUpdate={onUpdate}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}
