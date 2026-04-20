'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CalendarDays, Map, LayoutGrid, BarChart2, Settings, Server } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/today', label: 'Hoy', icon: CalendarDays },
  { href: '/future', label: 'Horizonte', icon: Map },
  { href: '/kanban', label: 'Tablero', icon: LayoutGrid },
  { href: '/stats', label: 'Stats', icon: BarChart2 },
  { href: '/settings', label: 'Ajustes', icon: Settings },
  { href: '/infra', label: 'Infra', icon: Server },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-20 bg-white border-t border-slate-200 pb-safe">
      <div className="flex items-stretch h-16">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors',
                isActive ? 'text-blue-600' : 'text-slate-400 hover:text-slate-700'
              )}
            >
              <Icon size={20} strokeWidth={isActive ? 2.2 : 1.8} />
              <span className="text-[10px] font-medium leading-none">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
