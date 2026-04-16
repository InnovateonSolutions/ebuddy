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
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-violet-600 px-4 py-2 shadow-lg shadow-blue-500/30 text-xs font-semibold text-white select-none pointer-events-none">
      <span className="w-2 h-2 rounded-full bg-green-300 inline-block animate-pulse" />
      {count.toLocaleString('es-MX')} visitas
    </div>
  )
}
