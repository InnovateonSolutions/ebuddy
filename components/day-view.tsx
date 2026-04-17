'use client'

import { useState, useCallback, useEffect } from 'react'
import { Briefcase, User, Calendar, RefreshCw, Clock, MapPin } from 'lucide-react'
import TicketCard from '@/components/ticket-card'
import CaptureForm from '@/components/capture-form'
import ManualTicketForm from '@/components/manual-ticket-form'
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

  // Cargar eventos de calendario al montar
  useEffect(() => {
    fetch('/api/calendar/events?days=1')
      .then((r) => r.json())
      .then((json: ApiResponse<CalendarEventsResponse>) => {
        if (json.success) setCalendarEvents(json.data.events)
      })
      .catch(() => {})
      .finally(() => setCalendarLoading(false))
  }, [])

  // Realtime — nuevo ticket
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

  // Captura nueva desde el formulario inline
  function handleTicketCreated(ticket: Ticket) {
    const isToday = ticket.dueDate === initialData.date || !ticket.dueDate
    if (!isToday) return
    handleInsert(ticket)
  }

  const totalToday = negocioTickets.length + personalTickets.length

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Columna principal — Tickets */}
      <div className="lg:col-span-2 space-y-4">
        <ManualTicketForm onTicketCreated={handleTicketCreated} />
        <CaptureForm onTicketCreated={handleTicketCreated} />

        {/* Tabs de contexto */}
        <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
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

        {/* Lista de tickets */}
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

      {/* Columna lateral — Calendario */}
      <div className="space-y-3">
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <Calendar size={14} />
              <span>Agenda del día</span>
            </div>
            {calendarLoading && (
              <RefreshCw size={13} className="text-slate-400 animate-spin" />
            )}
          </div>

          <div className="p-2">
            {!calendarLoading && calendarEvents.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">
                Sin eventos hoy
              </p>
            ) : (
              calendarEvents.map((event) => (
                <CalendarAgendaItem key={event.id} event={event} />
              ))
            )}
          </div>
        </div>

        {/* Resumen rápido */}
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 mb-2 font-medium">Resumen de hoy</p>
          <p className="text-2xl font-bold text-slate-900">{totalToday}</p>
          <p className="text-xs text-slate-500">
            {totalToday === 1 ? 'tarea pendiente' : 'tareas pendientes'}
          </p>
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
    <div className="flex gap-3 py-2 px-3 rounded-lg hover:bg-slate-50 transition-colors">
      <div
        className={`w-0.5 rounded-full flex-shrink-0 self-stretch ${
          event.provider === 'GOOGLE' ? 'bg-blue-400' : 'bg-indigo-400'
        }`}
      />

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800 truncate">{event.title}</p>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="flex items-center gap-1 text-xs text-slate-500">
            <Clock size={11} />
            {timeLabel}
          </span>
          {event.location && (
            <span className="flex items-center gap-1 text-xs text-slate-400 truncate max-w-[200px]">
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
      className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
        active
          ? 'bg-white text-slate-900 shadow-sm'
          : 'text-slate-500 hover:text-slate-700'
      }`}
    >
      {icon}
      {label}
      <span
        className={`text-xs px-1.5 py-0.5 rounded-full ${
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
      <div className="text-center py-12 text-slate-400">
        <p className="text-3xl mb-2">✓</p>
        <p className="text-sm font-medium">{emptyLabel}</p>
        <p className="text-xs mt-1">Usa el formulario de arriba para capturar o crear algo nuevo</p>
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
