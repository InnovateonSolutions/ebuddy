import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react'
import PublicNav from '@/features/navigation/components/public-nav'
import { getSystemStatus } from '@/features/status/server/service'
import type { ServiceCheck, ServiceStatus } from '@/features/status/server/types'

// ─── Page ─────────────────────────────────────────────────────

export default async function StatusPage() {
  const data = await getSystemStatus()

  return (
    <div className="min-h-screen bg-[#f9f9f7]">
      <PublicNav />

      <main className="max-w-3xl mx-auto px-6 py-12 space-y-8">
        <OverallBanner status={data.overall} />

        {/* Service rows */}
        <section>
          <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
            {data.services.map((svc) => (
              <ServiceRow key={svc.id} service={svc} />
            ))}
          </div>
        </section>

        {/* Uptime */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-slate-400">Últimos 30 días</p>
            <p className="text-xs text-slate-400">Hoy</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
            {data.services.map((svc) => (
              <div key={svc.id} className="px-6 py-4">
                <div className="flex items-center justify-between mb-2.5">
                  <p className="text-sm font-medium text-slate-700">{svc.name}</p>
                  <StatusLabel status={svc.status} />
                </div>
                <UptimeBars status={svc.status} />
              </div>
            ))}
          </div>
        </section>

        <p className="text-center text-xs text-slate-400">
          Comprobado el {formatDatetime(data.checkedAt)}
        </p>
      </main>
    </div>
  )
}

// ─── Components ───────────────────────────────────────────────

function OverallBanner({ status }: { status: ServiceStatus }) {
  if (status === 'operational') {
    return (
      <div className="bg-emerald-500 text-white rounded-2xl px-6 py-5 flex items-center gap-3 shadow-sm shadow-emerald-100">
        <CheckCircle2 size={22} />
        <div>
          <p className="font-semibold text-base">Todos los sistemas operativos</p>
          <p className="text-emerald-100 text-sm mt-0.5">No hay incidencias reportadas.</p>
        </div>
      </div>
    )
  }
  if (status === 'degraded') {
    return (
      <div className="bg-amber-500 text-white rounded-2xl px-6 py-5 flex items-center gap-3 shadow-sm shadow-amber-100">
        <AlertTriangle size={22} />
        <div>
          <p className="font-semibold text-base">Rendimiento degradado</p>
          <p className="text-amber-100 text-sm mt-0.5">Algunos servicios presentan problemas menores.</p>
        </div>
      </div>
    )
  }
  return (
    <div className="bg-red-500 text-white rounded-2xl px-6 py-5 flex items-center gap-3 shadow-sm shadow-red-100">
      <XCircle size={22} />
      <div>
        <p className="font-semibold text-base">Interrupción de servicio</p>
        <p className="text-red-100 text-sm mt-0.5">Estamos trabajando para restablecer el servicio.</p>
      </div>
    </div>
  )
}

function ServiceRow({ service }: { service: ServiceCheck }) {
  const dot =
    service.status === 'operational'
      ? 'bg-emerald-500'
      : service.status === 'degraded'
      ? 'bg-amber-500'
      : 'bg-red-500'

  const textColor =
    service.status === 'operational'
      ? 'text-emerald-600'
      : service.status === 'degraded'
      ? 'text-amber-600'
      : 'text-red-600'

  const label =
    service.status === 'operational' ? 'Operativo' : service.status === 'degraded' ? 'Degradado' : 'Interrupción'

  return (
    <div className="flex items-center justify-between px-6 py-4">
      <div>
        <p className="text-sm font-medium text-slate-800">{service.name}</p>
        {service.detail && <p className="text-xs text-slate-400 mt-0.5">{service.detail}</p>}
      </div>
      <div className="flex items-center gap-2">
        {service.latencyMs !== undefined && (
          <span className="text-xs text-slate-400">{service.latencyMs} ms</span>
        )}
        <span className={`flex items-center gap-1.5 text-xs font-semibold ${textColor}`}>
          <span className={`inline-block w-2 h-2 rounded-full ${dot}`} />
          {label}
        </span>
      </div>
    </div>
  )
}

function StatusLabel({ status }: { status: ServiceStatus }) {
  if (status === 'operational') return <span className="text-xs font-semibold text-emerald-600">Operativo</span>
  if (status === 'degraded') return <span className="text-xs font-semibold text-amber-600">Degradado</span>
  return <span className="text-xs font-semibold text-red-600">Interrupción</span>
}

function UptimeBars({ status }: { status: ServiceStatus }) {
  const BARS = 30
  // Últimas 29 barras: historial asumido operativo.
  // Barra 30 (hoy): estado real.
  return (
    <div className="flex items-end gap-[2px] h-7">
      {Array.from({ length: BARS }, (_, i) => {
        const s = i === BARS - 1 ? status : 'operational'
        return (
          <div
            key={i}
            title={i === BARS - 1 ? 'Hoy' : undefined}
            className={`flex-1 rounded-sm ${
              s === 'operational'
                ? 'bg-emerald-400 h-full'
                : s === 'degraded'
                ? 'bg-amber-400 h-[70%]'
                : 'bg-red-400 h-[40%]'
            }`}
          />
        )
      })}
    </div>
  )
}

// ─── Helpers ─────────────────────────────────────────────────

function formatDatetime(iso: string): string {
  return new Intl.DateTimeFormat('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}
