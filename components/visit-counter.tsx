'use client'

import { useEffect, useState } from 'react'

const STORAGE_KEY = 'ebuddy_visit_count'

export default function VisitCounter() {
  const [count, setCount] = useState<number | null>(null)

  useEffect(() => {
    const prev = parseInt(localStorage.getItem(STORAGE_KEY) ?? '0', 10)
    const next = prev + 1
    localStorage.setItem(STORAGE_KEY, String(next))
    setCount(next)
  }, [])

  if (count === null) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-1.5 rounded-full bg-white/80 backdrop-blur-sm border border-slate-200 px-3 py-1.5 shadow-sm text-xs text-slate-400 select-none pointer-events-none">
      <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
      {count.toLocaleString('es-MX')} visitas
    </div>
  )
}
