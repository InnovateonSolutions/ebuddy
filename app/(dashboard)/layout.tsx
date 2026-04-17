import Link from 'next/link'
import { auth, signOut } from '@/lib/auth/config'
import { redirect } from 'next/navigation'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  async function logoutAction() {
    'use server'

    await signOut?.({ redirectTo: '/login' })
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navbar */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          {/* Logo + Nav */}
          <div className="flex items-center gap-6">
            <Link href="/today" className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
                <span className="text-white text-xs font-bold">e</span>
              </div>
              <span className="font-semibold text-slate-900 text-sm">ebuddy</span>
            </Link>

            <div className="flex items-center gap-1">
              <Link
                href="/today"
                className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              >
                Hoy
              </Link>
              <Link
                href="/future"
                className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              >
                Horizonte
              </Link>
              <Link
                href="/kanban"
                className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              >
                Tablero
              </Link>
              <Link
                href="/settings"
                className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              >
                Ajustes
              </Link>
            </div>
          </div>

          {/* User */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500 hidden sm:block">
              {session.user.name ?? session.user.email}
            </span>
            <form action={logoutAction}>
              <button
                type="submit"
                className="text-sm text-slate-500 hover:text-slate-700 transition-colors px-2 py-1 rounded-lg hover:bg-slate-100"
              >
                Salir
              </button>
            </form>
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-6">{children}</main>

    </div>
  )
}
