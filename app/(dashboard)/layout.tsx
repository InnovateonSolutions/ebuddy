import Link from 'next/link'
import { auth, signOut } from '@/lib/auth/config'
import { redirect } from 'next/navigation'
import { isOwner } from '@/lib/auth/owner'
import { NavLink } from '@/features/navigation/components/nav-link'
import { SearchCommand } from '@/features/navigation/components/search-command'
import { BottomNav } from '@/features/navigation/components/bottom-nav'
import { UserMenu } from '@/features/navigation/components/user-menu'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  async function logoutAction() {
    'use server'
    if (!signOut) throw new Error('signOut no disponible — verifica AUTH_SECRET')
    await signOut({ redirectTo: '/login' })
  }

  const owner = isOwner(session.user.email)
  const name = session.user.name ?? session.user.email ?? ''
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()

  return (
    <div className="dashboard-shell">
      <nav className="dashboard-topbar">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          {/* Logo + Nav */}
          <div className="flex items-center gap-5 min-w-0">
            <Link href="/today" className="flex items-center gap-2 flex-shrink-0">
              <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center shadow-sm shadow-slate-300">
                <span className="text-white text-xs font-bold">e</span>
              </div>
              <div className="hidden sm:block">
                <span className="block text-sm font-semibold text-slate-950">ebuddy</span>
                <span className="block text-[11px] leading-none text-slate-500">Panel operativo personal</span>
              </div>
            </Link>

            <div className="hidden sm:flex items-center gap-0.5">
              <NavLink href="/today">Hoy</NavLink>
              <NavLink href="/future">Horizonte</NavLink>
              <NavLink href="/kanban">Tablero</NavLink>
              <NavLink href="/stats">Stats</NavLink>
              {owner && <NavLink href="/infra">Infra</NavLink>}
              {owner && <NavLink href="/costs">Costos</NavLink>}
            </div>
          </div>

          {/* Search */}
          <SearchCommand />

          {/* User */}
          <UserMenu initials={initials} logoutAction={logoutAction} />
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 py-5 pb-24 sm:py-6 sm:pb-6">{children}</main>

      <BottomNav owner={owner} />
    </div>
  )
}
