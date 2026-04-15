'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Trash2, Circle, Clock, CheckCircle2, FlaskConical } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { Ticket, TicketStatus } from '@/types/database'
import type { ApiResponse } from '@/types/api'

interface TicketCardProps {
  ticket: Ticket
  onUpdate: (ticket: Ticket) => void
  onDelete: (id: string) => void
}

const STATUS_CYCLE: TicketStatus[] = ['PENDING', 'IN_PROGRESS', 'QA', 'DONE']
const STATUS_LABELS: Record<TicketStatus, string> = {
  PENDING: 'Pendiente',
  IN_PROGRESS: 'En progreso',
  QA: 'En revisión',
  DONE: 'Listo',
}

export default function TicketCard({ ticket, onUpdate, onDelete }: TicketCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function cycleStatus() {
    if (updating) return
    const currentIndex = STATUS_CYCLE.indexOf(ticket.status)
    const nextStatus = STATUS_CYCLE[(currentIndex + 1) % STATUS_CYCLE.length]

    setUpdating(true)
    const res = await fetch(`/api/tickets/${ticket.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: nextStatus }),
    })
    const json: ApiResponse<Ticket> = await res.json()
    if (json.success) onUpdate(json.data)
    setUpdating(false)
  }

  async function handleDelete() {
    if (deleting || !confirm('¿Eliminar este ticket?')) return
    setDeleting(true)
    await fetch(`/api/tickets/${ticket.id}`, { method: 'DELETE' })
    onDelete(ticket.id)
  }

  const StatusIcon =
    ticket.status === 'DONE'
      ? CheckCircle2
      : ticket.status === 'IN_PROGRESS'
      ? Clock
      : ticket.status === 'QA'
      ? FlaskConical
      : Circle

  return (
    <div
      className={cn(
        'bg-white rounded-xl border transition-all',
        ticket.status === 'DONE' ? 'border-slate-100 opacity-60' : 'border-slate-200',
        deleting && 'opacity-30 pointer-events-none'
      )}
    >
      {/* Header siempre visible */}
      <div className="flex items-start gap-3 p-4">
        {/* Status toggle */}
        <button
          onClick={cycleStatus}
          disabled={updating}
          title={STATUS_LABELS[ticket.status]}
          className={cn(
            'mt-0.5 flex-shrink-0 transition-colors',
            ticket.status === 'DONE' ? 'text-green-500' : ticket.status === 'IN_PROGRESS' ? 'text-blue-500' : ticket.status === 'QA' ? 'text-violet-500' : 'text-slate-300 hover:text-slate-500',
            updating && 'opacity-50'
          )}
        >
          <StatusIcon size={20} />
        </button>

        {/* Título + badges */}
        <div className="flex-1 min-w-0">
          <p
            className={cn(
              'text-sm font-medium text-slate-900 leading-snug',
              ticket.status === 'DONE' && 'line-through text-slate-500'
            )}
          >
            {ticket.title}
          </p>

          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            <Badge variant={ticket.context === 'NEGOCIO' ? 'negocio' : 'personal'}>
              {ticket.context === 'NEGOCIO' ? 'Negocio' : 'Personal'}
            </Badge>
            <Badge variant={ticket.priority.toLowerCase() as 'alta' | 'media' | 'baja'}>
              {ticket.priority}
            </Badge>
            {ticket.dueDate && (
              <span className="text-xs text-slate-400">
                {formatDate(ticket.dueDate)}
              </span>
            )}
          </div>
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={handleDelete}
            className="p-1.5 text-slate-300 hover:text-red-400 transition-colors rounded-lg hover:bg-red-50"
          >
            <Trash2 size={15} />
          </button>
          <button
            onClick={() => setExpanded((e) => !e)}
            className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors rounded-lg hover:bg-slate-100"
          >
            {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
        </div>
      </div>

      {/* Detalle expandido */}
      {expanded && (
        <div className="px-4 pb-4 pt-0 border-t border-slate-100 mt-0">
          <div className="pl-8 space-y-3 pt-3">
            {ticket.overview && (
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Contexto</p>
                <p className="text-sm text-slate-600 leading-relaxed">{ticket.overview}</p>
              </div>
            )}
            {ticket.whatToDo && (
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Qué hacer</p>
                <p className="text-sm text-slate-700 font-medium">{ticket.whatToDo}</p>
              </div>
            )}
            {ticket.nextSteps.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Siguientes pasos</p>
                <ol className="space-y-1">
                  {ticket.nextSteps.map((step, i) => (
                    <li key={i} className="flex gap-2 text-sm text-slate-600">
                      <span className="text-slate-400 flex-shrink-0">{i + 1}.</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  return new Intl.DateTimeFormat('es-MX', {
    month: 'short',
    day: 'numeric',
  }).format(date)
}
