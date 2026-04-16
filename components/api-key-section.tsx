'use client'

import { useState } from 'react'

interface ApiKeySectionProps {
  initialKey: string | null
}

export function ApiKeySection({ initialKey }: ApiKeySectionProps) {
  const [apiKey, setApiKey] = useState<string | null>(initialKey)
  const [revealed, setRevealed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const maskedKey = apiKey
    ? apiKey.slice(0, 8) + '•'.repeat(24) + apiKey.slice(-8)
    : null

  async function handleGenerate() {
    setLoading(true)
    try {
      const res = await fetch('/api/user/api-key', { method: 'POST' })
      const json = await res.json()
      if (json.success) {
        setApiKey(json.data.key)
        setRevealed(true)
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleCopy() {
    if (!apiKey) return
    await navigator.clipboard.writeText(apiKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200">
      <div className="p-4">
        <h2 className="text-sm font-semibold text-slate-700 mb-1">API Key</h2>
        <p className="text-xs text-slate-500 mb-4">
          Úsala para autenticar requests externos (OpenClaw, scripts, etc.)
        </p>

        {apiKey ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
              <code className="flex-1 text-xs text-slate-700 font-mono truncate">
                {revealed ? apiKey : maskedKey}
              </code>
              <button
                onClick={() => setRevealed((v) => !v)}
                className="text-xs text-slate-500 hover:text-slate-700 shrink-0"
                type="button"
              >
                {revealed ? 'Ocultar' : 'Ver'}
              </button>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleCopy}
                type="button"
                className="text-xs font-medium px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
              >
                {copied ? '✓ Copiada' : 'Copiar'}
              </button>
              <button
                onClick={handleGenerate}
                disabled={loading}
                type="button"
                className="text-xs font-medium px-3 py-1.5 rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors disabled:opacity-50"
              >
                {loading ? 'Generando...' : 'Regenerar'}
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Regenerar invalida la key anterior. Actualiza tus integraciones.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-slate-500">No tienes una API key todavía.</p>
            <button
              onClick={handleGenerate}
              disabled={loading}
              type="button"
              className="text-xs font-medium px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Generando...' : 'Generar API Key'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
