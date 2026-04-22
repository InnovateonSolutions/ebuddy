'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Loader2, PlusSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createTicket } from '@/features/tickets/server/client'
import type { CreateTicketInput, Ticket, TicketContext, TicketPriority } from '@/lib/types'

interface ManualTicketFormProps {
  onTicketCreated?: (ticket: Ticket) => void
}

const PRIORITIES: TicketPriority[] = ['ALTA', 'MEDIA', 'BAJA']
const CONTEXTS: TicketContext[] = ['NEGOCIO', 'PERSONAL']

const DEFAULT_FORM: CreateTicketInput = {
  title: '',
  context: 'NEGOCIO',
  priority: 'MEDIA',
  due_date: null,
  overview: '',
  what_to_do: '',
}

export default function ManualTicketForm({ onTicketCreated }: ManualTicketFormProps) {
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<CreateTicketInput>(DEFAULT_FORM)

  function updateField<K extends keyof CreateTicketInput>(key: K, value: CreateTicketInput[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim() || submitting) return

    setSubmitting(true)
    setError(null)

    try {
      const payload: CreateTicketInput = {
        ...form,
        title: form.title.trim(),
        overview: form.overview?.trim() ?? '',
        what_to_do: form.what_to_do?.trim() ?? '',
        due_date: form.due_date || null,
      }

      const json = await createTicket(payload)
      if (!json.success) {
        setError(json.error)
        return
      }

      onTicketCreated?.(json.data)
      setForm(DEFAULT_FORM)
      setOpen(false)
    } catch {
      setError('No se pudo crear el ticket. Intenta de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="dashboard-panel">
      <div className="flex items-center justify-between gap-3 p-4">
        <div>
          <p className="dashboard-section-title">Alta manual</p>
          <h2 className="mt-2 text-sm font-semibold text-slate-900">Crear ticket</h2>
          <p className="mt-1 text-xs text-slate-500">
            Para tareas que ya tienes claras y quieres dejar ordenadas desde el inicio.
          </p>
        </div>
        <Button
          type="button"
          variant={open ? 'secondary' : 'default'}
          size="sm"
          onClick={() => setOpen((value) => !value)}
          className="shrink-0"
        >
          <PlusSquare size={14} />
          {open ? 'Ocultar' : 'Crear ticket'}
          {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </Button>
      </div>

      {open && (
        <form onSubmit={handleSubmit} className="border-t border-slate-100 p-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block md:col-span-2">
              <span className="mb-1.5 block text-xs font-medium text-slate-600">Titulo</span>
              <input
                value={form.title}
                onChange={(e) => updateField('title', e.target.value)}
                placeholder="Ej. Preparar propuesta para cliente X"
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                maxLength={200}
                required
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-slate-600">Contexto</span>
              <select
                value={form.context}
                onChange={(e) => updateField('context', e.target.value as TicketContext)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                {CONTEXTS.map((context) => (
                  <option key={context} value={context}>
                    {context === 'NEGOCIO' ? 'Negocio' : 'Personal'}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-slate-600">Prioridad</span>
              <select
                value={form.priority ?? 'MEDIA'}
                onChange={(e) => updateField('priority', e.target.value as TicketPriority)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                {PRIORITIES.map((priority) => (
                  <option key={priority} value={priority}>
                    {priority}
                  </option>
                ))}
              </select>
            </label>

            <label className="block md:col-span-2">
              <span className="mb-1.5 block text-xs font-medium text-slate-600">Fecha objetivo</span>
              <input
                type="date"
                value={form.due_date ?? ''}
                onChange={(e) => updateField('due_date', e.target.value || null)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </label>

            <label className="block md:col-span-2">
              <span className="mb-1.5 block text-xs font-medium text-slate-600">Contexto adicional</span>
              <textarea
                value={form.overview ?? ''}
                onChange={(e) => updateField('overview', e.target.value)}
                placeholder="Notas, antecedentes o criterios de aceptacion"
                rows={3}
                className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </label>

            <label className="block md:col-span-2">
              <span className="mb-1.5 block text-xs font-medium text-slate-600">Que hacer</span>
              <input
                value={form.what_to_do ?? ''}
                onChange={(e) => updateField('what_to_do', e.target.value)}
                placeholder="Accion principal esperada"
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                maxLength={500}
              />
            </label>
          </div>

          {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

          <div className="mt-4 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting || !form.title.trim()}>
              {submitting ? <Loader2 size={14} className="animate-spin" /> : <PlusSquare size={14} />}
              Guardar ticket
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
