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
    <div className="min-h-screen bg-slate-50">
      {/* Navbar */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          {/* Logo + Nav */}
          <div className="flex items-center gap-5 min-w-0">
            <Link href="/today" className="flex items-center gap-2 flex-shrink-0">
              <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
                <span className="text-white text-xs font-bold">e</span>
              </div>
              <span className="font-semibold text-slate-900 text-sm hidden sm:block">ebuddy</span>
            </Link>

            <div className="hidden sm:flex items-center gap-0.5">
              <NavLink href="/today">Hoy</NavLink>
              <NavLink href="/future">Horizonte</NavLink>
              <NavLink href="/kanban">Tablero</NavLink>
              <NavLink href="/stats">Stats</NavLink>
              {owner && <NavLink href="/infra">Infra</NavLink>}
            </div>
          </div>

          {/* Search */}
          <SearchCommand />

          {/* User */}
          <UserMenu initials={initials} logoutAction={logoutAction} />
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-4 py-6 pb-24 sm:pb-6">{children}</main>

      <BottomNav owner={owner} />
    </div>
  )
}
