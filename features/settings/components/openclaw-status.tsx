'use client'

import { useState } from 'react'
import { Check, Loader2, AlertCircle, Webhook } from 'lucide-react'

type Status = 'idle' | 'checking' | 'ok' | 'error'

interface OpenClawStatusProps {
  configured: boolean
}

export function OpenClawStatus({ configured }: OpenClawStatusProps) {
  const [status, setStatus] = useState<Status>('idle')
  const [version, setVersion] = useState<string | null>(null)

  async function test() {
    setStatus('checking')
    try {
      const res = await fetch('/api/user/openclaw-status')
      const data = await res.json() as { data: { available: boolean; version: string | null } }
      if (data.data.available) {
        setVersion(data.data.version)
        setStatus('ok')
      } else {
        setStatus('error')
      }
    } catch {
      setStatus('error')
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100">
      <div className="px-5 py-4">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
          OpenClaw
        </h2>

        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center flex-shrink-0">
            <Webhook size={16} className="text-slate-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-800">Gateway de mensajería</p>
            <p className="text-xs text-slate-400 mt-0.5">
              {configured
                ? 'Conecta WhatsApp, Telegram y más desde elitemini'
                : 'Configura OPENCLAW_BASE_URL y OPENCLAW_GATEWAY_TOKEN para activar'}
            </p>
            {status === 'ok' && version && (
              <p className="text-xs text-emerald-600 font-medium mt-1">v{version}</p>
            )}
          </div>
          <button
            onClick={test}
            disabled={!configured || status === 'checking'}
            className="flex-shrink-0 flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            {status === 'checking' && <Loader2 size={12} className="animate-spin" />}
            {status === 'ok' && <Check size={12} className="text-emerald-500" />}
            {status === 'error' && <AlertCircle size={12} className="text-red-500" />}
            {status === 'idle' && <Webhook size={12} />}
            {status === 'idle' && 'Probar'}
            {status === 'checking' && 'Probando...'}
            {status === 'ok' && 'Conectado'}
            {status === 'error' && 'Sin conexión'}
          </button>
        </div>
      </div>
    </div>
  )
}
