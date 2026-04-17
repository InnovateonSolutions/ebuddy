import Link from 'next/link'
import { auth } from '@/lib/auth/config'
import { redirect } from 'next/navigation'

export default async function RootPage() {
  const session = await auth()
  if (session?.user?.id) redirect('/today')

  return (
    <main className="min-h-screen bg-white text-slate-900">
      {/* Nav */}
      <header className="border-b border-slate-100 sticky top-0 bg-white/90 backdrop-blur z-10">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
              <span className="text-white text-xs font-bold">e</span>
            </div>
            <span className="font-semibold text-slate-900 text-sm">ebuddy</span>
          </div>
          <Link
            href="/login"
            className="text-sm font-medium text-slate-700 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition px-4 py-1.5 rounded-lg"
          >
            Entrar
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-24 pb-20 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-4 py-1.5 text-xs font-medium text-blue-600 mb-8">
          Acceso por invitación
        </div>

        <h1 className="text-5xl sm:text-6xl font-black tracking-tight text-balance leading-[1.05] mb-6">
          Tu día, organizado<br className="hidden sm:block" /> con inteligencia.
        </h1>

        <p className="max-w-xl mx-auto text-lg text-slate-500 leading-relaxed mb-10">
          ebuddy captura lo que tienes que hacer, lo ordena por contexto y prioridad,
          y te muestra exactamente qué atender hoy — sin ruido, sin apps extra.
        </p>

        <Link
          href="/login"
          className="inline-flex items-center gap-2 bg-blue-600 text-white font-semibold px-8 py-3.5 rounded-xl hover:bg-blue-700 transition shadow-lg shadow-blue-100"
        >
          Comenzar ahora
        </Link>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 pb-24">
        <div className="grid sm:grid-cols-3 gap-6">
          <FeatureCard
            icon="🎯"
            title="Vista de Hoy"
            description="Cada mañana ves solo lo que importa: tus tareas pendientes y tus eventos del día en un solo lugar."
          />
          <FeatureCard
            icon="📋"
            title="Tablero Kanban"
            description="Mueve tareas entre To Do, En progreso, QA y Listo. Arrastra con el dedo o desde el escritorio."
          />
          <FeatureCard
            icon="🤖"
            title="Captura con IA"
            description="Describe lo que necesitas hacer en lenguaje natural y la IA lo convierte en un ticket estructurado."
          />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100 py-8">
        <p className="text-center text-xs text-slate-400">
          ebuddy — construido por{' '}
          <span className="font-medium text-slate-500">Martín Cuevas Tavizón</span>
        </p>
      </footer>
    </main>
  )
}

function FeatureCard({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-6">
      <div className="text-3xl mb-3">{icon}</div>
      <h3 className="font-semibold text-slate-900 mb-1.5">{title}</h3>
      <p className="text-sm text-slate-500 leading-relaxed">{description}</p>
    </div>
  )
}
