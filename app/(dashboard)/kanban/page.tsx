import { auth } from '@/lib/auth/config'
import { redirect } from 'next/navigation'
import KanbanBoard from '@/features/tickets/components/kanban-board'
import { getKanbanTickets } from '@/features/tickets/server/queries'

export const dynamic = 'force-dynamic'

export default async function KanbanPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const { negocio, personal } = await getKanbanTickets(session.user.id)

  return (
    <div className="space-y-6">
      <section className="dashboard-hero">
        <p className="dashboard-kicker">Tablero</p>
        <h1 className="dashboard-title">Flujo de trabajo</h1>
        <p className="dashboard-subtitle">
          Mueve tareas entre estados, limpia completados y revisa negocio y personal sin perder contexto.
        </p>
      </section>
      <KanbanBoard initialNegocio={negocio} initialPersonal={personal} />
    </div>
  )
}
