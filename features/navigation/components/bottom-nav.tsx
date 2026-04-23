'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CalendarDays, Map, LayoutGrid, BarChart2, Settings, Server, CircleDollarSign } from 'lucide-react'
import { cn } from '@/lib/utils'

const USER_NAV = [
  { href: '/today', label: 'Hoy', icon: CalendarDays },
  { href: '/future', label: 'Horizonte', icon: Map },
  { href: '/kanban', label: 'Tablero', icon: LayoutGrid },
  { href: '/stats', label: 'Stats', icon: BarChart2 },
  { href: '/settings', label: 'Ajustes', icon: Settings },
]

const OWNER_EXTRA = [
  { href: '/infra', label: 'Infra', icon: Server },
  { href: '/costs', label: 'Costos', icon: CircleDollarSign },
]

export function BottomNav({ owner = false }: { owner?: boolean }) {
  const pathname = usePathname()
  const NAV_ITEMS = owner ? [...USER_NAV.slice(0, 3), ...OWNER_EXTRA, USER_NAV[4]] : USER_NAV

  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-20 border-t border-slate-200 bg-white/95 backdrop-blur-xl pb-safe">
      <div className="flex items-stretch h-16">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex-1 flex flex-col items-center justify-center gap-1 transition-colors',
                isActive ? 'text-slate-950' : 'text-slate-400 hover:text-slate-700'
              )}
            >
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-xl transition-colors',
                  isActive ? 'bg-slate-900 text-white' : 'bg-transparent'
                )}
              >
                <Icon size={20} strokeWidth={isActive ? 2.2 : 1.8} />
              </div>
              <span className="text-[10px] font-medium leading-none">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
