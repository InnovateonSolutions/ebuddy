'use client'

import { useState } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
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
  GripVertical,
  X,
  Pencil,
  Archive,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { Ticket, TicketContext, TicketPriority, TicketStatus } from '@/lib/types'
import {
  deleteTicket as deleteTicketRequest,
  updateTicket as updateTicketRequest,
} from '@/lib/ticket-client'
import { formatTicketDate, getNextTicketStatus } from '@/lib/ticket-ui'

// ─── Column config ────────────────────────────────────────────

interface Column {
  id: TicketStatus
  label: string
  color: string
  headerBg: string
  countBg: string
  dropBg: string
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
    dropBg: 'bg-slate-100',
    Icon: Circle,
    iconColor: 'text-slate-400',
  },
  {
    id: 'IN_PROGRESS',
    label: 'In Progress',
    color: 'border-blue-200',
    headerBg: 'bg-blue-50',
    countBg: 'bg-blue-100 text-blue-700',
    dropBg: 'bg-blue-50',
    Icon: Clock,
    iconColor: 'text-blue-500',
  },
  {
    id: 'QA',
    label: 'QA',
    color: 'border-violet-200',
    headerBg: 'bg-violet-50',
    countBg: 'bg-violet-100 text-violet-700',
    dropBg: 'bg-violet-50',
    Icon: FlaskConical,
    iconColor: 'text-violet-500',
  },
  {
    id: 'DONE',
    label: 'Done',
    color: 'border-emerald-200',
    headerBg: 'bg-emerald-50',
    countBg: 'bg-emerald-100 text-emerald-700',
    dropBg: 'bg-emerald-50',
    Icon: CheckCircle2,
    iconColor: 'text-emerald-500',
  },
]

// ─── Types ────────────────────────────────────────────────────

interface KanbanBoardProps {
  initialNegocio: Ticket[]
  initialPersonal: Ticket[]
  readonly?: boolean
}

// ─── Board ────────────────────────────────────────────────────

export default function KanbanBoard({
  initialNegocio,
  initialPersonal,
  readonly = false,
}: KanbanBoardProps) {
  const [negocio, setNegocio] = useState<Ticket[]>(initialNegocio)
  const [personal, setPersonal] = useState<Ticket[]>(initialPersonal)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [openTicketId, setOpenTicketId] = useState<string | null>(null)
  const [filterPriority, setFilterPriority] = useState<TicketPriority | null>(null)
  const [filterContext, setFilterContext] = useState<'ALL' | 'NEGOCIO' | 'PERSONAL'>('ALL')
  const [archiving, setArchiving] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
  )

  function updateTicket(ticket: Ticket) {
    setNegocio((prev) => prev.map((t) => (t.id === ticket.id ? ticket : t)))
    setPersonal((prev) => prev.map((t) => (t.id === ticket.id ? ticket : t)))
  }

  function deleteTicket(id: string, context: TicketContext) {
    if (context === 'NEGOCIO') setNegocio((prev) => prev.filter((t) => t.id !== id))
    else setPersonal((prev) => prev.filter((t) => t.id !== id))
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string)
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveId(null)
    if (!over) return

    const ticketId = active.id as string
    // Droppable IDs are "${context}|${status}" to avoid duplicates across sections
    const newStatus = (over.id as string).split('|')[1] as TicketStatus
    const all = [...negocio, ...personal]
    const ticket = all.find((t) => t.id === ticketId)
    if (!ticket || ticket.status === newStatus) return

    const previous = { ...ticket }
    updateTicket({ ...ticket, status: newStatus })

    try {
      const json = await updateTicketRequest(ticketId, { status: newStatus })
      if (json.success) {
        updateTicket(json.data)
      } else {
        updateTicket(previous)
      }
    } catch {
      updateTicket(previous)
    }
  }

  const allTickets = [...negocio, ...personal]
  const activeTicket = activeId ? allTickets.find((t) => t.id === activeId) : null
  const openTicket = openTicketId ? allTickets.find((t) => t.id === openTicketId) : null

  const filteredNegocio = negocio.filter((t) => !filterPriority || t.priority === filterPriority)
  const filteredPersonal = personal.filter((t) => !filterPriority || t.priority === filterPriority)

  const hasActiveFilters = filterPriority !== null || filterContext !== 'ALL'

  async function handleArchiveDone() {
    if (archiving) return
    const doneCount = [...negocio, ...personal].filter((t) => t.status === 'DONE').length
    if (!doneCount) return
    if (!confirm(`¿Archivar ${doneCount} ticket${doneCount !== 1 ? 's' : ''} completados con más de 30 días?`)) return
    setArchiving(true)
    try {
      const res = await fetch('/api/tickets/archive-done', { method: 'POST' })
      const json = await res.json()
      if (json.success) {
        setNegocio((prev) => prev.filter((t) => t.status !== 'DONE'))
        setPersonal((prev) => prev.filter((t) => t.status !== 'DONE'))
      }
    } finally {
      setArchiving(false)
    }
  }

  return (
    <DndContext
      sensors={readonly ? [] : sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {/* Filter bar */}
      <div className="flex items-center gap-2 flex-wrap mb-6">
        <span className="text-xs text-slate-400 font-medium">Prioridad</span>
        {(['ALTA', 'MEDIA', 'BAJA'] as TicketPriority[]).map((p) => (
          <button
            key={p}
            onClick={() => setFilterPriority(filterPriority === p ? null : p)}
            className={cn(
              'text-[11px] px-2.5 py-1 rounded-full font-medium transition-colors',
              filterPriority === p
                ? p === 'ALTA'
                  ? 'bg-red-500 text-white'
                  : p === 'MEDIA'
                  ? 'bg-amber-500 text-white'
                  : 'bg-slate-500 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            )}
          >
            {p.charAt(0) + p.slice(1).toLowerCase()}
          </button>
        ))}
        <div className="w-px h-4 bg-slate-200 mx-1" />
        <span className="text-xs text-slate-400 font-medium">Contexto</span>
        {(['NEGOCIO', 'PERSONAL'] as const).map((ctx) => (
          <button
            key={ctx}
            onClick={() => setFilterContext(filterContext === ctx ? 'ALL' : ctx)}
            className={cn(
              'text-[11px] px-2.5 py-1 rounded-full font-medium transition-colors',
              filterContext === ctx
                ? 'bg-slate-700 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            )}
          >
            {ctx.charAt(0) + ctx.slice(1).toLowerCase()}
          </button>
        ))}
        {hasActiveFilters && (
          <button
            onClick={() => { setFilterPriority(null); setFilterContext('ALL') }}
            className="text-[11px] px-2 py-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors flex items-center gap-0.5"
          >
            <X size={10} /> Limpiar
          </button>
        )}
        <div className="ml-auto">
          <button
            onClick={handleArchiveDone}
            disabled={archiving}
            className="flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-slate-600 px-2.5 py-1 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-40"
          >
            <Archive size={12} />
            Archivar completados
          </button>
        </div>
      </div>

      <div className="space-y-10">
        {(filterContext === 'ALL' || filterContext === 'NEGOCIO') && (
          <BoardSection
            context="NEGOCIO"
            tickets={filteredNegocio}
            readonly={readonly}
            onUpdate={updateTicket}
            onDelete={deleteTicket}
            onOpen={setOpenTicketId}
          />
        )}
        {(filterContext === 'ALL' || filterContext === 'PERSONAL') && (
          <BoardSection
            context="PERSONAL"
            tickets={filteredPersonal}
            readonly={readonly}
            onUpdate={updateTicket}
            onDelete={deleteTicket}
            onOpen={setOpenTicketId}
          />
        )}
      </div>

      <DragOverlay>
        {activeTicket ? (
          <div className="rotate-1 opacity-95 pointer-events-none shadow-xl scale-105">
            <KanbanCard ticket={activeTicket} readonly={true} onUpdate={() => {}} onDelete={() => {}} onOpen={() => {}} />
          </div>
        ) : null}
      </DragOverlay>

      {openTicket && (
        <TicketDetailModal
          ticket={openTicket}
          onClose={() => setOpenTicketId(null)}
          onUpdate={updateTicket}
        />
      )}
    </DndContext>
  )
}

// ─── Section (Negocio / Personal) ────────────────────────────

interface BoardSectionProps {
  context: TicketContext
  tickets: Ticket[]
  readonly: boolean
  onUpdate: (t: Ticket) => void
  onDelete: (id: string, ctx: TicketContext) => void
  onOpen: (id: string) => void
}

function BoardSection({ context, tickets, readonly, onUpdate, onDelete, onOpen }: BoardSectionProps) {
  const isNegocio = context === 'NEGOCIO'
  const total = tickets.length
  const done = tickets.filter((t) => t.status === 'DONE').length

  return (
    <section>
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
              onOpen={onOpen}
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
  onOpen: (id: string) => void
}

function KanbanColumn({ col, tickets, context, readonly, onUpdate, onDelete, onOpen }: KanbanColumnProps) {
  const droppableId = `${context}|${col.id}`
  const { setNodeRef, isOver } = useDroppable({ id: droppableId })

  return (
    <div className="flex flex-col gap-2">
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

      <div
        ref={setNodeRef}
        className={cn(
          'flex flex-col gap-2 min-h-[120px] rounded-lg transition-colors p-1',
          isOver && col.dropBg
        )}
      >
        {tickets.length === 0 ? (
          <div
            className={cn(
              'flex-1 flex flex-col items-center justify-center rounded-lg border border-dashed min-h-[80px] transition-all gap-1',
              isOver ? 'border-blue-300 bg-blue-50/60' : 'border-slate-200'
            )}
          >
            <p className="text-[10px] text-slate-300 select-none">Arrastra aquí</p>
          </div>
        ) : (
          tickets.map((ticket) =>
            readonly ? (
              <KanbanCard
                key={ticket.id}
                ticket={ticket}
                readonly={true}
                onUpdate={onUpdate}
                onDelete={onDelete}
                onOpen={onOpen}
              />
            ) : (
              <DraggableCard key={ticket.id} id={ticket.id}>
                <KanbanCard
                  ticket={ticket}
                  readonly={false}
                  onUpdate={onUpdate}
                  onDelete={onDelete}
                  onOpen={onOpen}
                />
              </DraggableCard>
            )
          )
        )}
      </div>
    </div>
  )
}

// ─── Draggable wrapper ────────────────────────────────────────

function DraggableCard({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id })

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{ opacity: isDragging ? 0.35 : 1 }}
      className="relative group/drag touch-none select-none cursor-grab active:cursor-grabbing"
    >
      <div className="absolute left-1 top-1/2 -translate-y-1/2 z-10 p-1 text-slate-200 hover:text-slate-400 opacity-0 group-hover/drag:opacity-100 transition-opacity pointer-events-none">
        <GripVertical size={12} />
      </div>
      {children}
    </div>
  )
}

// ─── Card ─────────────────────────────────────────────────────

interface KanbanCardProps {
  ticket: Ticket
  readonly: boolean
  onUpdate: (t: Ticket) => void
  onDelete: (id: string, ctx: TicketContext) => void
  onOpen: (id: string) => void
}

function KanbanCard({ ticket, readonly, onUpdate, onDelete, onOpen }: KanbanCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const isDone = ticket.status === 'DONE'

  async function cycleStatus() {
    if (updating || readonly) return
    const nextStatus = getNextTicketStatus(ticket.status)

    setUpdating(true)
    try {
      const json = await updateTicketRequest(ticket.id, { status: nextStatus })
      if (json.success) onUpdate(json.data)
    } finally {
      setUpdating(false)
    }
  }

  async function handleDelete() {
    if (deleting || readonly || !confirm('¿Eliminar este ticket?')) return
    setDeleting(true)
    try {
      const json = await deleteTicketRequest(ticket.id)
      if (json.success) onDelete(ticket.id, ticket.context)
    } finally {
      setDeleting(false)
    }
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
      onClick={() => onOpen(ticket.id)}
      className={cn(
        'bg-white rounded-lg border transition-all pl-4 cursor-pointer',
        isDone ? 'border-slate-100 opacity-55' : 'border-slate-200 hover:border-slate-300 hover:shadow-sm',
        deleting && 'opacity-30 pointer-events-none'
      )}
    >
      <div className="p-3">
        <div className="flex items-start gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); cycleStatus() }}
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
                  {formatTicketDate(ticket.dueDate)}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-0.5 flex-shrink-0">
            {!readonly && (
              <button
                onClick={(e) => { e.stopPropagation(); handleDelete() }}
                className="p-1 text-slate-200 hover:text-red-400 transition-colors rounded"
              >
                <Trash2 size={12} />
              </button>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v) }}
              className="p-1 text-slate-300 hover:text-slate-500 transition-colors rounded"
            >
              {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
          </div>
        </div>
      </div>

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

// ─── Ticket Detail Modal ──────────────────────────────────────

const STATUS_META: Record<TicketStatus, { label: string; color: string }> = {
  PENDING:     { label: 'To Do',       color: 'text-slate-500 bg-slate-100' },
  IN_PROGRESS: { label: 'En progreso', color: 'text-blue-700 bg-blue-100' },
  QA:          { label: 'En revisión', color: 'text-violet-700 bg-violet-100' },
  DONE:        { label: 'Listo',       color: 'text-emerald-700 bg-emerald-100' },
}

interface TicketDetailModalProps {
  ticket: Ticket
  onClose: () => void
  onUpdate: (t: Ticket) => void
}

function TicketDetailModal({ ticket, onClose, onUpdate }: TicketDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [draft, setDraft] = useState({
    title: ticket.title,
    status: ticket.status as TicketStatus,
    priority: ticket.priority as TicketPriority,
    dueDate: ticket.dueDate ?? '',
    overview: ticket.overview ?? '',
    whatToDo: ticket.whatToDo ?? '',
  })

  function startEdit() {
    setDraft({
      title: ticket.title,
      status: ticket.status as TicketStatus,
      priority: ticket.priority as TicketPriority,
      dueDate: ticket.dueDate ?? '',
      overview: ticket.overview ?? '',
      whatToDo: ticket.whatToDo ?? '',
    })
    setIsEditing(true)
  }

  function cancelEdit() {
    setIsEditing(false)
  }

  async function saveEdit() {
    if (!draft.title.trim()) return
    setSaving(true)
    try {
      const json = await updateTicketRequest(ticket.id, {
        title: draft.title.trim(),
        status: draft.status,
        priority: draft.priority,
        due_date: draft.dueDate || null,
        overview: draft.overview,
        what_to_do: draft.whatToDo,
      })
      if (json.success) {
        onUpdate(json.data)
        setIsEditing(false)
      }
    } finally {
      setSaving(false)
    }
  }

  const status = STATUS_META[ticket.status]

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm pb-safe"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl shadow-xl overflow-hidden pb-safe sm:pb-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-4 border-b border-slate-100">
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <input
                value={draft.title}
                onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                className="w-full text-sm font-semibold text-slate-900 border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <p className="text-sm font-semibold text-slate-900 leading-snug">{ticket.title}</p>
            )}

            {isEditing ? (
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <select
                  value={draft.status}
                  onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value as TicketStatus }))}
                  className="text-xs border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="PENDING">To Do</option>
                  <option value="IN_PROGRESS">En progreso</option>
                  <option value="QA">En revisión</option>
                  <option value="DONE">Listo</option>
                </select>
                <select
                  value={draft.priority}
                  onChange={(e) => setDraft((d) => ({ ...d, priority: e.target.value as TicketPriority }))}
                  className="text-xs border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="ALTA">Alta</option>
                  <option value="MEDIA">Media</option>
                  <option value="BAJA">Baja</option>
                </select>
                <input
                  type="date"
                  value={draft.dueDate}
                  onChange={(e) => setDraft((d) => ({ ...d, dueDate: e.target.value }))}
                  className="text-xs border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', status.color)}>
                  {status.label}
                </span>
                <Badge variant={ticket.context === 'NEGOCIO' ? 'negocio' : 'personal'}>
                  {ticket.context === 'NEGOCIO' ? 'Negocio' : 'Personal'}
                </Badge>
                <Badge variant={ticket.priority.toLowerCase() as 'alta' | 'media' | 'baja'}>
                  {ticket.priority}
                </Badge>
                {ticket.dueDate && (
                  <span className="text-xs text-slate-400">{formatTicketDate(ticket.dueDate)}</span>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            {!isEditing && (
              <button
                onClick={startEdit}
                className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors rounded-lg hover:bg-blue-50"
                title="Editar ticket"
              >
                <Pencil size={14} />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors rounded-lg hover:bg-slate-100"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
          {isEditing ? (
            <>
              <div>
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Contexto</p>
                <textarea
                  value={draft.overview}
                  onChange={(e) => setDraft((d) => ({ ...d, overview: e.target.value }))}
                  rows={3}
                  placeholder="Contexto y descripción..."
                  className="w-full text-sm text-slate-600 border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Qué hacer</p>
                <textarea
                  value={draft.whatToDo}
                  onChange={(e) => setDraft((d) => ({ ...d, whatToDo: e.target.value }))}
                  rows={2}
                  placeholder="Acción concreta..."
                  className="w-full text-sm text-slate-700 border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            </>
          ) : (
            <>
              {ticket.overview && (
                <div>
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Contexto</p>
                  <p className="text-sm text-slate-600 leading-relaxed">{ticket.overview}</p>
                </div>
              )}
              {ticket.whatToDo && (
                <div>
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Qué hacer</p>
                  <p className="text-sm text-slate-700 font-medium">{ticket.whatToDo}</p>
                </div>
              )}
              {ticket.nextSteps.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Siguientes pasos</p>
                  <ol className="space-y-1.5">
                    {ticket.nextSteps.map((step, i) => (
                      <li key={i} className="flex gap-2 text-sm text-slate-600">
                        <span className="text-slate-300 flex-shrink-0 font-medium">{i + 1}.</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
              {!ticket.overview && !ticket.whatToDo && ticket.nextSteps.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-4">Sin detalle adicional.</p>
              )}
            </>
          )}
        </div>

        {/* Edit footer */}
        {isEditing && (
          <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-100 bg-slate-50">
            <button
              onClick={cancelEdit}
              className="text-sm text-slate-500 hover:text-slate-700 px-4 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={saveEdit}
              disabled={saving || !draft.title.trim()}
              className="text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-4 py-1.5 rounded-lg transition-colors"
            >
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
