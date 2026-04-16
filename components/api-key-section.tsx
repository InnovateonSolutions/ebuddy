'use client'

import { useState } from 'react'

interface ApiKeySectionProps {
  hasKey: boolean
  initialPreview: string | null
}

function buildApiKeyPreview(apiKey: string) {
  return `${apiKey.slice(0, 8)}${'•'.repeat(24)}${apiKey.slice(-8)}`
}

export function ApiKeySection({ hasKey, initialPreview }: ApiKeySectionProps) {
  const [generatedKey, setGeneratedKey] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(initialPreview)
  const [revealed, setRevealed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const displayKey = generatedKey && revealed ? generatedKey : preview

  async function handleGenerate() {
    setLoading(true)
    try {
      const res = await fetch('/api/user/api-key', { method: 'POST' })
      const json = await res.json()
      if (json.success) {
        setGeneratedKey(json.data.key)
        setPreview(json.data.preview ?? buildApiKeyPreview(json.data.key))
        setRevealed(true)
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleCopy() {
    if (!generatedKey) return
    await navigator.clipboard.writeText(generatedKey)
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

        {hasKey || generatedKey ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
              <code className="flex-1 text-xs text-slate-700 font-mono truncate">
                {displayKey}
              </code>
              {generatedKey && (
                <button
                  onClick={() => setRevealed((value) => !value)}
                  className="text-xs text-slate-500 hover:text-slate-700 shrink-0"
                  type="button"
                >
                  {revealed ? 'Ocultar' : 'Ver'}
                </button>
              )}
            </div>

            <div className="flex gap-2">
              {generatedKey && (
                <button
                  onClick={handleCopy}
                  type="button"
                  className="text-xs font-medium px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                >
                  {copied ? '✓ Copiada' : 'Copiar'}
                </button>
              )}
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
              Solo mostramos la key completa al momento de regenerarla. Después conservamos una vista enmascarada.
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
