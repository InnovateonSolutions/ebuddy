import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LogoutButton from '@/components/logout-button'
import type { User } from '@/types/database'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single() as { data: User | null; error: unknown }

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
              {profile?.display_name ?? user.email}
            </span>
            <LogoutButton />
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-6">{children}</main>
    </div>
  )
}
