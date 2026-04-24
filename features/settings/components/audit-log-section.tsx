'use client'

import { useState } from 'react'
import { Shield, ChevronDown, ChevronUp } from 'lucide-react'

type AuditEntry = {
  id: string
  capability: string
  action: string
  resource: string
  outcome: 'allowed' | 'denied'
  details?: string | null
  createdAt: string
}

export function AuditLogSection() {
  const [entries, setEntries] = useState<AuditEntry[] | null>(null)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  async function load() {
    if (entries) { setOpen(!open); return }
    setLoading(true)
    try {
      const res = await fetch('/api/admin/audit')
      const body = await res.json()
      setEntries(body.data ?? [])
      setOpen(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="dashboard-panel">
      <button
        onClick={load}
        className="w-full flex items-center justify-between px-5 py-4 text-left"
      >
        <div className="flex items-center gap-3">
          <Shield size={16} className="text-slate-400" />
          <div>
            <p className="text-sm font-medium text-slate-800">Audit log de accesos privilegiados</p>
            <p className="text-xs text-slate-400">Últimas 50 acciones del owner</p>
          </div>
        </div>
        {loading
          ? <span className="text-xs text-slate-400">Cargando…</span>
          : open ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />
        }
      </button>

      {open && entries && (
        <div className="border-t border-slate-100 overflow-x-auto">
          {entries.length === 0 ? (
            <p className="px-5 py-4 text-sm text-slate-400">Sin registros todavía.</p>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 text-left">
                  <th className="px-5 py-2 font-medium">Capability</th>
                  <th className="px-3 py-2 font-medium">Acción</th>
                  <th className="px-3 py-2 font-medium">Resultado</th>
                  <th className="px-3 py-2 font-medium">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="px-5 py-2 font-mono text-slate-600">{e.capability}</td>
                    <td className="px-3 py-2 text-slate-500">{e.action}</td>
                    <td className="px-3 py-2">
                      <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                        e.outcome === 'allowed'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-red-50 text-red-700'
                      }`}>
                        {e.outcome === 'allowed' ? 'permitido' : 'denegado'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-400 whitespace-nowrap">
                      {new Date(e.createdAt).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
