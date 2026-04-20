'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Kanban, Activity } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_LINKS = [
  { href: '/kanban', label: 'Tablero', Icon: Kanban },
  { href: '/status', label: 'Estado', Icon: Activity },
]

export default function PublicNav() {
  const pathname = usePathname()

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="font-bold text-slate-900 tracking-tight text-sm hover:text-slate-700 transition">
          ebuddy
        </Link>

        {/* Nav links */}
        <nav className="flex items-center gap-1">
          {NAV_LINKS.map(({ href, label, Icon }) => {
            const active = pathname === href
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                  active
                    ? 'bg-slate-100 text-slate-900'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                )}
              >
                <Icon size={14} />
                {label}
              </Link>
            )
          })}
        </nav>

        {/* CTA */}
        <Link
          href="/login"
          className="text-xs font-semibold text-slate-700 border border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50 transition px-3 py-1.5 rounded-lg"
        >
          Acceder
        </Link>
      </div>
    </header>
  )
}
