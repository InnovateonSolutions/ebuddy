'use client'

import { useState } from 'react'
import {
  Circle,
  Clock,
  FlaskConical,
  CheckCircle2,
  Briefcase,
  User,
  ChevronDown,
  ChevronUp,
  Trash2,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { Ticket, TicketStatus, TicketContext } from '@/types/database'
import type { ApiResponse } from '@/types/api'

// ─── Column config ────────────────────────────────────────────

interface Column {
  id: TicketStatus
  label: string
  color: string          // ring / border accent
  headerBg: string       // subtle column header bg
  countBg: string        // pill badge
  Icon: React.ElementType
  iconColor: string
}

const COLUMNS: Column[] = [
  {
    id: 'PENDING',
    label: 'To Do',
    color: 'border-slate-200',
    headerBg: 'bg-slate-50',
    countBg: 'bg-slate-200 text-slate-600',
    Icon: Circle,
    iconColor: 'text-slate-400',
  },
  {
    id: 'IN_PROGRESS',
    label: 'In Progress',
    color: 'border-blue-200',
    headerBg: 'bg-blue-50',
    countBg: 'bg-blue-100 text-blue-700',
    Icon: Clock,
    iconColor: 'text-blue-500',
  },
  {
    id: 'QA',
    label: 'QA',
    color: 'border-violet-200',
    headerBg: 'bg-violet-50',
    countBg: 'bg-violet-100 text-violet-700',
    Icon: FlaskConical,
    iconColor: 'text-violet-500',
  },
  {
    id: 'DONE',
    label: 'Done',
    color: 'border-emerald-200',
    headerBg: 'bg-emerald-50',
    countBg: 'bg-emerald-100 text-emerald-700',
    Icon: CheckCircle2,
    iconColor: 'text-emerald-500',
  },
]

const STATUS_CYCLE: TicketStatus[] = ['PENDING', 'IN_PROGRESS', 'QA', 'DONE']

// ─── Types ────────────────────────────────────────────────────

interface KanbanBoardProps {
  initialNegocio: Ticket[]
  initialPersonal: Ticket[]
  readonly?: boolean          // true → sin interacciones (demo / no auth)
}

// ─── Board ────────────────────────────────────────────────────

export default function KanbanBoard({
  initialNegocio,
  initialPersonal,
  readonly = false,
}: KanbanBoardProps) {
  const [negocio, setNegocio] = useState<Ticket[]>(initialNegocio)
  const [personal, setPersonal] = useState<Ticket[]>(initialPersonal)

  function setTickets(context: TicketContext, fn: (prev: Ticket[]) => Ticket[]) {
    if (context === 'NEGOCIO') setNegocio(fn)
    else setPersonal(fn)
  }

  function handleUpdate(ticket: Ticket) {
    setNegocio((prev) => prev.map((t) => (t.id === ticket.id ? ticket : t)))
    setPersonal((prev) => prev.map((t) => (t.id === ticket.id ? ticket : t)))
  }

  function handleDelete(id: string, context: TicketContext) {
    setTickets(context, (prev) => prev.filter((t) => t.id !== id))
  }

  return (
    <div className="space-y-10">
      <BoardSection
        context="NEGOCIO"
        tickets={negocio}
        readonly={readonly}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
      />
      <BoardSection
        context="PERSONAL"
        tickets={personal}
        readonly={readonly}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
      />
    </div>
  )
}

// ─── Section (Negocio / Personal) ────────────────────────────

interface BoardSectionProps {
  context: TicketContext
  tickets: Ticket[]
  readonly: boolean
  onUpdate: (t: Ticket) => void
  onDelete: (id: string, ctx: TicketContext) => void
}

function BoardSection({ context, tickets, readonly, onUpdate, onDelete }: BoardSectionProps) {
  const isNegocio = context === 'NEGOCIO'
  const total = tickets.length
  const done = tickets.filter((t) => t.status === 'DONE').length

  return (
    <section>
      {/* Section header */}
      <div className="flex items-center gap-3 mb-4">
        <div
          className={cn(
            'flex items-center justify-center w-8 h-8 rounded-lg',
            isNegocio ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
          )}
        >
          {isNegocio ? <Briefcase size={15} /> : <User size={15} />}
        </div>
        <div>
          <h2 className="text-sm font-semibold text-slate-900 leading-none">
            {isNegocio ? 'Negocio' : 'Personal'}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {done} de {total} {total === 1 ? 'tarea completada' : 'tareas completadas'}
          </p>
        </div>
      </div>

      {/* Kanban columns */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {COLUMNS.map((col) => {
          const colTickets = tickets.filter((t) => t.status === col.id)
          return (
            <KanbanColumn
              key={col.id}
              col={col}
              tickets={colTickets}
              context={context}
              readonly={readonly}
              onUpdate={onUpdate}
              onDelete={onDelete}
            />
          )
        })}
      </div>
    </section>
  )
}

// ─── Column ───────────────────────────────────────────────────

interface KanbanColumnProps {
  col: Column
  tickets: Ticket[]
  context: TicketContext
  readonly: boolean
  onUpdate: (t: Ticket) => void
  onDelete: (id: string, ctx: TicketContext) => void
}

function KanbanColumn({ col, tickets, context, readonly, onUpdate, onDelete }: KanbanColumnProps) {
  return (
    <div className="flex flex-col gap-2">
      {/* Column header */}
      <div
        className={cn(
          'flex items-center justify-between px-3 py-2 rounded-lg border',
          col.headerBg,
          col.color
        )}
      >
        <div className="flex items-center gap-1.5">
          <col.Icon size={13} className={col.iconColor} />
          <span className="text-xs font-semibold text-slate-700">{col.label}</span>
        </div>
        <span className={cn('text-xs font-medium px-1.5 py-0.5 rounded-full', col.countBg)}>
          {tickets.length}
        </span>
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-2 min-h-[120px]">
        {tickets.length === 0 ? (
          <div className="flex-1 flex items-center justify-center rounded-lg border border-dashed border-slate-200 min-h-[80px]">
            <p className="text-xs text-slate-300">Vacío</p>
          </div>
        ) : (
          tickets.map((ticket) => (
            <KanbanCard
              key={ticket.id}
              ticket={ticket}
              readonly={readonly}
              onUpdate={onUpdate}
              onDelete={onDelete}
            />
          ))
        )}
      </div>
    </div>
  )
}

// ─── Card ─────────────────────────────────────────────────────

interface KanbanCardProps {
  ticket: Ticket
  readonly: boolean
  onUpdate: (t: Ticket) => void
  onDelete: (id: string, ctx: TicketContext) => void
}

function KanbanCard({ ticket, readonly, onUpdate, onDelete }: KanbanCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const isDone = ticket.status === 'DONE'

  async function cycleStatus() {
    if (updating || readonly) return
    const idx = STATUS_CYCLE.indexOf(ticket.status)
    const nextStatus = STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length]

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
    if (deleting || readonly || !confirm('¿Eliminar este ticket?')) return
    setDeleting(true)
    await fetch(`/api/tickets/${ticket.id}`, { method: 'DELETE' })
    onDelete(ticket.id, ticket.context)
  }

  const StatusIcon =
    ticket.status === 'DONE'
      ? CheckCircle2
      : ticket.status === 'IN_PROGRESS'
      ? Clock
      : ticket.status === 'QA'
      ? FlaskConical
      : Circle

  const iconColor =
    ticket.status === 'DONE'
      ? 'text-emerald-500'
      : ticket.status === 'IN_PROGRESS'
      ? 'text-blue-500'
      : ticket.status === 'QA'
      ? 'text-violet-500'
      : 'text-slate-300'

  return (
    <div
      className={cn(
        'bg-white rounded-lg border transition-all',
        isDone ? 'border-slate-100 opacity-55' : 'border-slate-200 hover:border-slate-300 hover:shadow-sm',
        deleting && 'opacity-30 pointer-events-none'
      )}
    >
      {/* Header */}
      <div className="p-3">
        <div className="flex items-start gap-2">
          <button
            onClick={cycleStatus}
            disabled={updating || readonly}
            title={readonly ? '' : 'Avanzar estado'}
            className={cn(
              'mt-0.5 flex-shrink-0 transition-colors',
              iconColor,
              !readonly && 'hover:opacity-70 cursor-pointer',
              readonly && 'cursor-default',
              updating && 'opacity-40'
            )}
          >
            <StatusIcon size={15} />
          </button>

          <div className="flex-1 min-w-0">
            <p
              className={cn(
                'text-xs font-medium text-slate-800 leading-snug',
                isDone && 'line-through text-slate-400'
              )}
            >
              {ticket.title}
            </p>

            <div className="flex items-center gap-1 mt-1.5 flex-wrap">
              <Badge
                variant={ticket.priority.toLowerCase() as 'alta' | 'media' | 'baja'}
                className="text-[10px] px-1.5 py-0"
              >
                {ticket.priority}
              </Badge>
              {ticket.dueDate && (
                <span className="text-[10px] text-slate-400">
                  {formatDate(ticket.dueDate)}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-0.5 flex-shrink-0">
            {!readonly && (
              <button
                onClick={handleDelete}
                className="p-1 text-slate-200 hover:text-red-400 transition-colors rounded"
              >
                <Trash2 size={12} />
              </button>
            )}
            <button
              onClick={() => setExpanded((e) => !e)}
              className="p-1 text-slate-300 hover:text-slate-500 transition-colors rounded"
            >
              {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
          </div>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-3 pb-3 border-t border-slate-100">
          <div className="pl-5 pt-2.5 space-y-2">
            {ticket.whatToDo && (
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">
                  Qué hacer
                </p>
                <p className="text-xs text-slate-600 leading-relaxed">{ticket.whatToDo}</p>
              </div>
            )}
            {ticket.nextSteps.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">
                  Siguientes pasos
                </p>
                <ol className="space-y-0.5">
                  {ticket.nextSteps.map((step, i) => (
                    <li key={i} className="flex gap-1.5 text-xs text-slate-500">
                      <span className="text-slate-300 flex-shrink-0">{i + 1}.</span>
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

// ─── Helpers ─────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('es-MX', { month: 'short', day: 'numeric' }).format(
    new Date(dateStr + 'T00:00:00')
  )
}
