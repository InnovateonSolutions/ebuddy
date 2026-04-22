'use client'

import { useState, useTransition } from 'react'
import { Check, Loader2, Cpu, Cloud, Zap, AlertCircle } from 'lucide-react'

type AIProvider = 'claude' | 'ollama' | 'auto'

interface AiProviderSelectorProps {
  aiProvider: AIProvider
  ollamaModel: string
}

const PROVIDERS: { value: AIProvider; label: string; description: string; icon: React.ReactNode }[] = [
  {
    value: 'claude',
    label: 'Claude (Anthropic)',
    description: 'Máxima calidad. Requiere conexión a internet.',
    icon: <Cloud size={16} className="text-blue-500" />,
  },
  {
    value: 'ollama',
    label: 'Llama (local)',
    description: 'Privado y sin costo por token. Requiere Ollama en red.',
    icon: <Cpu size={16} className="text-emerald-500" />,
  },
  {
    value: 'auto',
    label: 'Automático',
    description: 'Usa Llama si está disponible, Claude como respaldo.',
    icon: <Zap size={16} className="text-amber-500" />,
  },
]

export function AiProviderSelector({ aiProvider, ollamaModel }: AiProviderSelectorProps) {
  const [provider, setProvider] = useState<AIProvider>(aiProvider)
  const [model, setModel] = useState(ollamaModel)
  const [saved, setSaved] = useState(false)
  const [ollamaStatus, setOllamaStatus] = useState<'idle' | 'checking' | 'ok' | 'error'>('idle')
  const [isPending, startTransition] = useTransition()

  function save() {
    startTransition(async () => {
      await fetch('/api/user/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aiProvider: provider, ollamaModel: model }),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    })
  }

  async function testOllama() {
    setOllamaStatus('checking')
    try {
      const res = await fetch('/api/user/ollama-status')
      const data = await res.json() as { available: boolean }
      setOllamaStatus(data.available ? 'ok' : 'error')
    } catch {
      setOllamaStatus('error')
    }
  }

  return (
    <div className="dashboard-panel divide-y divide-slate-100">
      <div className="px-5 py-4">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
          Proveedor de IA
        </h2>

        <div className="space-y-2">
          {PROVIDERS.map((p) => (
            <label
              key={p.value}
              className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                provider === p.value
                  ? 'border-blue-200 bg-blue-50'
                  : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              <input
                type="radio"
                name="ai-provider"
                value={p.value}
                checked={provider === p.value}
                onChange={() => setProvider(p.value)}
                className="mt-0.5 accent-blue-600"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  {p.icon}
                  <span className="text-sm font-medium text-slate-800">{p.label}</span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">{p.description}</p>
              </div>
            </label>
          ))}
        </div>

        {(provider === 'ollama' || provider === 'auto') && (
          <div className="mt-4 space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Modelo Ollama
              </label>
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="llama3:latest"
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
              <p className="text-xs text-slate-400 mt-1">
                Usa <code className="bg-slate-100 px-1 rounded">ollama list</code> para ver tus modelos disponibles
              </p>
            </div>

            <button
              onClick={testOllama}
              disabled={ollamaStatus === 'checking'}
              className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium transition-colors hover:bg-slate-50 disabled:opacity-60"
            >
              {ollamaStatus === 'checking' && <Loader2 size={12} className="animate-spin" />}
              {ollamaStatus === 'ok' && <Check size={12} className="text-emerald-500" />}
              {ollamaStatus === 'error' && <AlertCircle size={12} className="text-red-500" />}
              {ollamaStatus === 'idle' && <Cpu size={12} />}
              {ollamaStatus === 'idle' && 'Probar conexión'}
              {ollamaStatus === 'checking' && 'Verificando...'}
              {ollamaStatus === 'ok' && 'Ollama disponible'}
              {ollamaStatus === 'error' && 'No disponible — verificar OLLAMA_BASE_URL'}
            </button>
          </div>
        )}
      </div>

      <div className="px-5 py-3 flex items-center justify-between">
        <p className="text-xs text-slate-400">
          Afecta la captura de tickets por voz y texto
        </p>
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
