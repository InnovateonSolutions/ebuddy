'use client'

import { useState, useTransition } from 'react'
import { Check, Loader2 } from 'lucide-react'

const TIMEZONES = [
  { value: 'America/Tijuana', label: 'Tijuana (UTC-8/−7)' },
  { value: 'America/Los_Angeles', label: 'Los Ángeles (UTC-8/−7)' },
  { value: 'America/Denver', label: 'Denver (UTC-7/−6)' },
  { value: 'America/Chicago', label: 'Chicago (UTC-6/−5)' },
  { value: 'America/Mexico_City', label: 'Ciudad de México (UTC-6/−5)' },
  { value: 'America/Monterrey', label: 'Monterrey (UTC-6/−5)' },
  { value: 'America/New_York', label: 'Nueva York (UTC-5/−4)' },
  { value: 'America/Bogota', label: 'Bogotá (UTC-5)' },
  { value: 'America/Lima', label: 'Lima (UTC-5)' },
  { value: 'America/Santiago', label: 'Santiago (UTC-4/−3)' },
  { value: 'America/Argentina/Buenos_Aires', label: 'Buenos Aires (UTC-3)' },
  { value: 'Europe/Madrid', label: 'Madrid (UTC+1/+2)' },
  { value: 'UTC', label: 'UTC' },
]

interface PreferencesFormProps {
  timezone: string
  workStart: string
  workEnd: string
}

export function PreferencesForm({ timezone, workStart, workEnd }: PreferencesFormProps) {
  const [tz, setTz] = useState(timezone)
  const [start, setStart] = useState(workStart)
  const [end, setEnd] = useState(workEnd)
  const [saved, setSaved] = useState(false)
  const [isPending, startTransition] = useTransition()

  function save() {
    startTransition(async () => {
      await fetch('/api/user/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timezone: tz, workStart: start, workEnd: end }),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    })
  }

  return (
    <div className="dashboard-panel divide-y divide-slate-100">
      <div className="px-5 py-4">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Preferencias</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Zona horaria</label>
            <select
              value={tz}
              onChange={(e) => setTz(e.target.value)}
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {TIMEZONES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Inicio de jornada</label>
              <input
                type="time"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Fin de jornada</label>
              <input
                type="time"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="px-5 py-3 flex items-center justify-between">
        <p className="text-xs text-slate-400">Afecta el orden y filtrado de tareas por fecha</p>
        <button
          onClick={save}
          disabled={isPending}
          className="flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 transition-colors"
        >
          {isPending ? <Loader2 size={14} className="animate-spin" /> : saved ? <Check size={14} /> : null}
          {saved ? 'Guardado' : 'Guardar'}
        </button>
      </div>
    </div>
  )
}
