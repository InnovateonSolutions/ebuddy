'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

export function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname()
  const isActive = pathname === href || pathname.startsWith(href + '/')

  return (
    <Link
      href={href}
      className={cn(
        'px-3 py-2 rounded-xl text-sm font-medium transition-all',
        isActive
          ? 'bg-white text-slate-950 shadow-sm shadow-slate-200/80'
          : 'text-slate-500 hover:text-slate-900 hover:bg-white/80'
      )}
    >
      {children}
    </Link>
  )
}
