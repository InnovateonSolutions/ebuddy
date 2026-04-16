import { auth } from '@/lib/auth/config'
import { redirect } from 'next/navigation'
import KanbanBoard from '@/components/kanban-board'
import PublicNav from '@/components/public-nav'
import { getKanbanTickets } from '@/lib/tickets'

export const dynamic = 'force-dynamic'

export default async function KanbanPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const userId = session.user.id
  const { negocio, personal } = await getKanbanTickets(userId)

  return (
    <div className="min-h-screen bg-slate-50">
      <PublicNav />

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-xl font-bold text-slate-900">Tablero</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Gestiona tus tareas de negocio y personales en un solo lugar.
          </p>
        </div>

        <KanbanBoard initialNegocio={negocio} initialPersonal={personal} />
      </main>
    </div>
  )
}
