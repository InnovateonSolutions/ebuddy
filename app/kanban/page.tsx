import KanbanBoard from '@/components/kanban-board'
import PublicNav from '@/components/public-nav'
import type { Ticket } from '@/types/database'

// ─── Mock data — visible sin autenticación ────────────────────
// Reemplazar por carga real desde DB una vez que el login esté listo.

const MOCK_NEGOCIO: Ticket[] = [
  {
    id: 'n1',
    userId: 'demo',
    title: 'Definir arquitectura de microservicios',
    context: 'NEGOCIO',
    overview: 'Diseñar la separación de servicios para la siguiente fase del producto.',
    whatToDo: 'Crear diagrama C4 y definir contratos de API entre servicios.',
    nextSteps: ['Revisar propuestas existentes', 'Agendar sesión con equipo', 'Documentar decisiones'],
    priority: 'ALTA',
    status: 'PENDING',
    dueDate: null,
    rawInput: '',
    createdAt: new Date('2026-04-14T10:00:00Z'),
    updatedAt: new Date('2026-04-14T10:00:00Z'),
  },
  {
    id: 'n2',
    userId: 'demo',
    title: 'Revisar propuesta de cliente Apex',
    context: 'NEGOCIO',
    overview: 'El cliente envió una propuesta actualizada que necesita revisión y respuesta.',
    whatToDo: 'Leer propuesta, identificar puntos de negociación y preparar contra-propuesta.',
    nextSteps: ['Leer documento completo', 'Identificar puntos críticos', 'Preparar respuesta'],
    priority: 'MEDIA',
    status: 'PENDING',
    dueDate: '2026-04-17',
    rawInput: '',
    createdAt: new Date('2026-04-14T11:00:00Z'),
    updatedAt: new Date('2026-04-14T11:00:00Z'),
  },
  {
    id: 'n3',
    userId: 'demo',
    title: 'Actualizar documentación de API',
    context: 'NEGOCIO',
    overview: 'Los endpoints nuevos aún no están documentados en el README.',
    whatToDo: 'Agregar sección de endpoints nuevos con ejemplos de request/response.',
    nextSteps: ['Listar endpoints nuevos', 'Agregar ejemplos', 'Publicar cambios'],
    priority: 'BAJA',
    status: 'PENDING',
    dueDate: null,
    rawInput: '',
    createdAt: new Date('2026-04-14T12:00:00Z'),
    updatedAt: new Date('2026-04-14T12:00:00Z'),
  },
  {
    id: 'n4',
    userId: 'demo',
    title: 'Integrar pasarela de pagos',
    context: 'NEGOCIO',
    overview: 'Conectar Stripe para procesar suscripciones mensuales.',
    whatToDo: 'Implementar webhook de Stripe y lógica de activación de cuenta.',
    nextSteps: ['Crear cuenta Stripe', 'Implementar webhook', 'Probar en sandbox'],
    priority: 'ALTA',
    status: 'IN_PROGRESS',
    dueDate: '2026-04-20',
    rawInput: '',
    createdAt: new Date('2026-04-13T09:00:00Z'),
    updatedAt: new Date('2026-04-15T08:00:00Z'),
  },
  {
    id: 'n5',
    userId: 'demo',
    title: 'Configurar pipeline CI/CD',
    context: 'NEGOCIO',
    overview: 'Automatizar el deploy a producción desde GitHub Actions.',
    whatToDo: 'Crear workflow que buildee imagen Docker y haga push al registry.',
    nextSteps: ['Definir stages', 'Escribir YAML', 'Validar en rama staging'],
    priority: 'MEDIA',
    status: 'IN_PROGRESS',
    dueDate: null,
    rawInput: '',
    createdAt: new Date('2026-04-12T14:00:00Z'),
    updatedAt: new Date('2026-04-14T16:00:00Z'),
  },
  {
    id: 'n6',
    userId: 'demo',
    title: 'Validar endpoints de autenticación',
    context: 'NEGOCIO',
    overview: 'Los nuevos endpoints de auth necesitan pasar por QA antes del release.',
    whatToDo: 'Ejecutar suite de tests de integración y revisar edge cases.',
    nextSteps: ['Correr tests', 'Revisar logs', 'Aprobar o rechazar'],
    priority: 'ALTA',
    status: 'QA',
    dueDate: '2026-04-16',
    rawInput: '',
    createdAt: new Date('2026-04-11T10:00:00Z'),
    updatedAt: new Date('2026-04-15T09:00:00Z'),
  },
  {
    id: 'n7',
    userId: 'demo',
    title: 'Setup inicial del repositorio',
    context: 'NEGOCIO',
    overview: 'Configuración inicial de Next.js, Tailwind y estructura de carpetas.',
    whatToDo: 'Completado.',
    nextSteps: [],
    priority: 'MEDIA',
    status: 'DONE',
    dueDate: null,
    rawInput: '',
    createdAt: new Date('2026-04-01T09:00:00Z'),
    updatedAt: new Date('2026-04-01T18:00:00Z'),
  },
  {
    id: 'n8',
    userId: 'demo',
    title: 'Configurar Tailwind y shadcn/ui',
    context: 'NEGOCIO',
    overview: 'Instalación y configuración del sistema de diseño base.',
    whatToDo: 'Completado.',
    nextSteps: [],
    priority: 'BAJA',
    status: 'DONE',
    dueDate: null,
    rawInput: '',
    createdAt: new Date('2026-04-02T10:00:00Z'),
    updatedAt: new Date('2026-04-02T15:00:00Z'),
  },
]

const MOCK_PERSONAL: Ticket[] = [
  {
    id: 'p1',
    userId: 'demo',
    title: 'Renovar licencia de conducir',
    context: 'PERSONAL',
    overview: 'La licencia vence a fin de mes y necesito sacar cita en el SARE.',
    whatToDo: 'Entrar a la web del SARE y agendar cita para renovación.',
    nextSteps: ['Verificar documentos necesarios', 'Agendar cita online', 'Asistir'],
    priority: 'MEDIA',
    status: 'PENDING',
    dueDate: '2026-04-30',
    rawInput: '',
    createdAt: new Date('2026-04-10T08:00:00Z'),
    updatedAt: new Date('2026-04-10T08:00:00Z'),
  },
  {
    id: 'p2',
    userId: 'demo',
    title: 'Planear viaje a CDMX',
    context: 'PERSONAL',
    overview: 'Viaje familiar planeado para mayo. Falta definir fechas y transporte.',
    whatToDo: 'Revisar vuelos disponibles y comparar precios en dos aerolíneas.',
    nextSteps: ['Confirmar fechas con familia', 'Buscar vuelos', 'Reservar hotel'],
    priority: 'BAJA',
    status: 'PENDING',
    dueDate: null,
    rawInput: '',
    createdAt: new Date('2026-04-09T19:00:00Z'),
    updatedAt: new Date('2026-04-09T19:00:00Z'),
  },
  {
    id: 'p3',
    userId: 'demo',
    title: 'Curso de TypeScript avanzado',
    context: 'PERSONAL',
    overview: 'Completar módulo de generics y utility types del curso en línea.',
    whatToDo: 'Terminar sección 4 del curso y hacer los ejercicios prácticos.',
    nextSteps: ['Ver videos pendientes', 'Hacer ejercicios', 'Revisar notas'],
    priority: 'ALTA',
    status: 'IN_PROGRESS',
    dueDate: null,
    rawInput: '',
    createdAt: new Date('2026-04-08T20:00:00Z'),
    updatedAt: new Date('2026-04-14T21:00:00Z'),
  },
  {
    id: 'p4',
    userId: 'demo',
    title: 'Leer Clean Architecture',
    context: 'PERSONAL',
    overview: 'Libro de Uncle Bob sobre principios de arquitectura limpia. Terminado.',
    whatToDo: 'Completado.',
    nextSteps: [],
    priority: 'MEDIA',
    status: 'DONE',
    dueDate: null,
    rawInput: '',
    createdAt: new Date('2026-03-20T08:00:00Z'),
    updatedAt: new Date('2026-04-05T22:00:00Z'),
  },
]

// ─── Page ─────────────────────────────────────────────────────

export default function KanbanPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <PublicNav />

      {/* Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Page title */}
        <div className="mb-8">
          <h1 className="text-xl font-bold text-slate-900">Tablero</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Gestiona tus tareas de negocio y personales en un solo lugar.
          </p>
        </div>

        <KanbanBoard
          initialNegocio={MOCK_NEGOCIO}
          initialPersonal={MOCK_PERSONAL}
          readonly={true}
        />
      </main>
    </div>
  )
}
