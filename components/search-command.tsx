'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Ticket } from '@/lib/types'

interface SearchCommandProps {
  onSelect?: (ticket: Ticket) => void
}

export function SearchCommand({ onSelect }: SearchCommandProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(true)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50)
    else { setQuery(''); setResults([]) }
  }, [open])

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (query.length < 2) { setResults([]); return }
    timerRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/tickets/search?q=${encodeURIComponent(query)}`)
        const json = await res.json()
        if (json.success) setResults(json.data)
      } finally {
        setLoading(false)
      }
    }, 300)
  }, [query])

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 text-sm text-slate-400 border border-slate-200 rounded-lg px-3 py-1.5 hover:bg-slate-50 hover:text-slate-600 transition-colors"
      >
        <Search size={13} />
        <span className="hidden md:inline text-xs">Buscar</span>
        <kbd className="hidden md:inline text-[10px] bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded font-mono">⌘K</kbd>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] bg-black/40 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
              {loading
                ? <Loader2 size={15} className="text-slate-400 animate-spin flex-shrink-0" />
                : <Search size={15} className="text-slate-400 flex-shrink-0" />}
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar tickets..."
                className="flex-1 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none bg-transparent"
              />
              <button onClick={() => setOpen(false)} className="p-1 text-slate-300 hover:text-slate-500 rounded">
                <X size={13} />
              </button>
            </div>

            {results.length > 0 && (
              <div className="py-1.5 max-h-[380px] overflow-y-auto">
                {results.map((ticket) => (
                  <button
                    key={ticket.id}
                    onClick={() => { onSelect?.(ticket); setOpen(false) }}
                    className="w-full flex items-start gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors text-left"
                  >
                    <div
                      className={cn(
                        'mt-1 w-2 h-2 rounded-full flex-shrink-0',
                        ticket.context === 'NEGOCIO' ? 'bg-blue-400' : 'bg-emerald-400'
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-800 truncate">{ticket.title}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {ticket.context === 'NEGOCIO' ? 'Negocio' : 'Personal'} · {ticket.priority} · {ticket.status}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {query.length >= 2 && !loading && results.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-8">Sin resultados para &ldquo;{query}&rdquo;</p>
            )}
            {query.length < 2 && (
              <p className="text-xs text-slate-300 text-center py-6">Escribe al menos 2 caracteres para buscar</p>
            )}
          </div>
        </div>
      )}
    </>
  )
}
