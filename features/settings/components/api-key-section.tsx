'use client'

import { useState } from 'react'

interface ApiKeySectionProps {
  hasKey: boolean
  initialPreview: string | null
}

function buildApiKeyPreview(apiKey: string) {
  return `${apiKey.slice(0, 8)}${'*'.repeat(24)}${apiKey.slice(-8)}`
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
    <div className="dashboard-panel">
      <div className="p-4">
        <p className="dashboard-section-title">API Key</p>
        <h2 className="mb-1 mt-2 text-sm font-semibold text-slate-700">Acceso externo</h2>
        <p className="mb-4 text-xs text-slate-500">
          Usala para autenticar requests externos como OpenClaw o scripts operativos.
        </p>

        {hasKey || generatedKey ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
              <code className="flex-1 truncate font-mono text-xs text-slate-700">
                {displayKey}
              </code>
              {generatedKey && (
                <button
                  onClick={() => setRevealed((value) => !value)}
                  className="shrink-0 text-xs text-slate-500 hover:text-slate-700"
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
                  className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-200"
                >
                  {copied ? 'Copiada' : 'Copiar'}
                </button>
              )}
              <button
                onClick={handleGenerate}
                disabled={loading}
                type="button"
                className="rounded-xl bg-amber-100 px-3 py-2 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-200 disabled:opacity-50"
              >
                {loading ? 'Generando...' : 'Regenerar'}
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Solo mostramos la key completa al momento de regenerarla. Despues conservamos una vista enmascarada.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-slate-500">Todavia no tienes una API key.</p>
            <button
              onClick={handleGenerate}
              disabled={loading}
              type="button"
              className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Generando...' : 'Generar API Key'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
