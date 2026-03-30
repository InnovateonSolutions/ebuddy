'use client'

import { useState, useEffect, useCallback } from 'react'
import TicketCard from '@/components/ticket-card'
import type { Ticket } from '@/types/database'
import type { FutureResponse, ApiResponse } from '@/types/api'

export default function FuturePage() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)

  const fetchTickets = useCallback(async (cursorParam?: string | null) => {
    const params = cursorParam ? `?cursor=${cursorParam}` : ''
    const res = await fetch(`/api/tickets/future${params}`)
    const json: ApiResponse<FutureResponse> = await res.json()
    if (!json.success) return

    const { tickets: newTickets, cursor: newCursor } = json.data
    setTickets((prev) => cursorParam ? [...prev, ...newTickets] : newTickets)
    setCursor(newCursor)
    setHasMore(!!newCursor)
  }, [])

  useEffect(() => {
    fetchTickets().finally(() => setLoading(false))
  }, [fetchTickets])

  async function loadMore() {
    setLoadingMore(true)
    await fetchTickets(cursor)
    setLoadingMore(false)
  }

  function handleTicketUpdate(updated: Ticket) {
    setTickets((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
  }

  function handleTicketDelete(id: string) {
    setTickets((prev) => prev.filter((t) => t.id !== id))
  }

  // Agrupar por semana
  const grouped = groupByWeek(tickets)

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 bg-white rounded-xl border border-slate-200 animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Horizonte futuro</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          {tickets.length} {tickets.length === 1 ? 'tarea pendiente' : 'tareas pendientes'}
        </p>
      </div>

      {tickets.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <p className="text-4xl mb-3">🎉</p>
          <p className="font-medium">No tienes tareas futuras pendientes</p>
          <p className="text-sm mt-1">Captura algo nuevo desde la vista de Hoy</p>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(({ label, tickets: groupTickets }) => (
            <div key={label}>
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                {label}
              </h2>
              <div className="space-y-2">
                {groupTickets.map((ticket) => (
                  <TicketCard
                    key={ticket.id}
                    ticket={ticket}
                    onUpdate={handleTicketUpdate}
                    onDelete={handleTicketDelete}
                  />
                ))}
              </div>
            </div>
          ))}

          {hasMore && (
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="w-full py-3 text-sm text-slate-500 hover:text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              {loadingMore ? 'Cargando...' : 'Cargar más'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function groupByWeek(tickets: Ticket[]) {
  const groups: Record<string, Ticket[]> = {}

  for (const ticket of tickets) {
    let label: string

    if (!ticket.due_date) {
      label = 'Sin fecha'
    } else {
      const date = new Date(ticket.due_date + 'T00:00:00')
      const now = new Date()
      const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

      if (diffDays <= 7) label = 'Esta semana'
      else if (diffDays <= 14) label = 'Próxima semana'
      else if (diffDays <= 30) label = 'Este mes'
      else label = 'Más adelante'
    }

    if (!groups[label]) groups[label] = []
    groups[label].push(ticket)
  }

  const ORDER = ['Esta semana', 'Próxima semana', 'Este mes', 'Más adelante', 'Sin fecha']
  return ORDER.filter((l) => groups[l]?.length).map((label) => ({
    label,
    tickets: groups[label],
  }))
}
