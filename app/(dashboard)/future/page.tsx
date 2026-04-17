export const dynamic = 'force-dynamic'

import { ComingSoon } from '@/components/coming-soon'

export default function FuturePage() {
  return (
    <ComingSoon
      title="Horizonte futuro"
      description="Aquí podrás planificar todo lo que viene: un calendario visual con tus tareas, agenda semanal de un vistazo y la capacidad de mover compromisos entre días con arrastrar y soltar."
      features={[
        'Vista de calendario semanal y mensual',
        'Drag & drop para reprogramar tareas',
        'Alertas de solapamientos y días cargados',
        'Integración con Google Calendar y Outlook',
      ]}
    />
  )
}
