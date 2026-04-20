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
        'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
        isActive
          ? 'bg-slate-100 text-slate-900'
          : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
      )}
    >
      {children}
    </Link>
  )
}
