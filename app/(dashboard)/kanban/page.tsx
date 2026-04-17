import { auth } from '@/lib/auth/config'
import { redirect } from 'next/navigation'
import KanbanBoard from '@/components/kanban-board'
import { getKanbanTickets } from '@/lib/tickets'

export const dynamic = 'force-dynamic'

export default async function KanbanPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const { negocio, personal } = await getKanbanTickets(session.user.id)

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Tablero</h1>
        <p className="text-sm text-slate-500 mt-0.5">Mueve tus tareas entre columnas arrastrando o con el menú.</p>
      </div>
      <KanbanBoard initialNegocio={negocio} initialPersonal={personal} />
    </div>
  )
}
