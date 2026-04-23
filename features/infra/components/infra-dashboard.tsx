'use client'

import React, { useState } from 'react'
import {
  Bot,
  BrainCircuit,
  CalendarClock,
  CheckCircle2,
  Cloud,
  Cpu,
  Database,
  HardDrive,
  MemoryStick,
  Orbit,
  RefreshCw,
  Server,
  Sparkles,
  Workflow,
  XCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DiagnosticsTarget, InfraSnapshot, RemoteServiceStatus, ResourceUsage } from '@/features/infra/server/types'

function fmtBytes(bytes: number) {
  if (bytes >= 1e12) return `${(bytes / 1e12).toFixed(1)} TB`
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`
  return `${(bytes / 1e6).toFixed(0)} MB`
}

function fmtPct(value?: number) {
  if (value === undefined) return 'Sin dato'
  return `${value.toFixed(1)}%`
}

function fmtTime(ts: string | null) {
  if (!ts) return 'Sin capturas'
  return new Date(ts).toLocaleString('es-MX', {
    hour: 'numeric',
    minute: '2-digit',
    month: 'short',
    day: 'numeric',
  })
}

function hostLabel(baseUrl: string) {
  if (!baseUrl) return 'Sin configurar'
  try {
    return new URL(baseUrl).host
  } catch {
    return baseUrl
  }
}

function openClawSummaryValue(service: RemoteServiceStatus) {
  if (!service.available) return service.version ?? 'Sin versión'
  return service.version ?? 'Disponible'
}

function toneClasses(ok: boolean) {
  return ok
    ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
    : 'bg-rose-50 text-rose-700 ring-1 ring-rose-200'
}

function StatusPill({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold', toneClasses(ok))}>
      {ok ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
      {children}
    </span>
  )
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  helper,
  ok,
}: {
  icon: React.ElementType
  label: string
  value: string
  helper: string
  ok: boolean
}) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white/90 p-4 shadow-sm shadow-slate-200/50">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            <Icon size={14} />
            {label}
          </p>
          <p className="text-lg font-semibold text-slate-950">{value}</p>
          <p className="text-xs text-slate-500">{helper}</p>
        </div>
        <StatusPill ok={ok}>{ok ? 'Operativo' : 'Revisar'}</StatusPill>
      </div>
    </div>
  )
}

function TabButton({
  active,
  icon: Icon,
  title,
  caption,
  onClick,
}: {
  active: boolean
  icon: React.ElementType
  title: string
  caption: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group flex min-h-24 w-full items-start gap-3 rounded-2xl border px-4 py-4 text-left transition-all',
        active
          ? 'border-slate-900 bg-slate-950 text-white shadow-lg shadow-slate-300/50'
          : 'border-slate-200 bg-white/85 text-slate-700 hover:border-slate-300 hover:bg-white'
      )}
    >
      <div className={cn(
        'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border transition-colors',
        active ? 'border-white/10 bg-white/10 text-white' : 'border-slate-200 bg-slate-50 text-slate-700'
      )}>
        <Icon size={18} />
      </div>
      <div className="space-y-1">
        <p className={cn('text-sm font-semibold', active ? 'text-white' : 'text-slate-900')}>{title}</p>
        <p className={cn('text-xs leading-5', active ? 'text-slate-300' : 'text-slate-500')}>{caption}</p>
      </div>
    </button>
  )
}

function MetricBar({
  icon: Icon,
  label,
  pct,
  detail,
}: {
  icon: React.ElementType
  label: string
  pct?: number
  detail: string
}) {
  const value = Math.max(0, Math.min(pct ?? 0, 100))
  const color = value >= 85 ? 'bg-rose-500' : value >= 70 ? 'bg-amber-400' : 'bg-sky-500'

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="flex items-center gap-2 font-medium text-slate-700">
          <Icon size={14} className="text-slate-400" />
          {label}
        </span>
        <span className="font-semibold text-slate-950">{fmtPct(pct)}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${value}%` }} />
      </div>
      <p className="text-xs text-slate-500">{detail}</p>
    </div>
  )
}

function UsageStack({ cpu, ram, disk }: { cpu?: number; ram?: ResourceUsage; disk?: ResourceUsage }) {
  if (cpu === undefined || !ram || !disk) {
    return <p className="text-sm text-slate-500">Todavía no hay una lectura suficiente para mostrar uso de CPU, RAM y disco.</p>
  }

  return (
    <div className="space-y-4">
      <MetricBar icon={Cpu} label="CPU" pct={cpu} detail="Uso total del host normalizado a 100%." />
      <MetricBar icon={MemoryStick} label="RAM" pct={ram.pct} detail={`${fmtBytes(ram.used)} en uso de ${fmtBytes(ram.total)}`} />
      <MetricBar icon={HardDrive} label="Disco" pct={disk.pct} detail={`${fmtBytes(disk.used)} usados de ${fmtBytes(disk.total)}`} />
    </div>
  )
}

function SectionCard({
  eyebrow,
  title,
  subtitle,
  children,
  accent = 'bg-white',
}: {
  eyebrow: string
  title: string
  subtitle: string
  children: React.ReactNode
  accent?: string
}) {
  return (
    <section className={cn('rounded-xl border border-slate-200 p-5 shadow-sm shadow-slate-200/40', accent)}>
      <div className="mb-5 space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">{eyebrow}</p>
        <div className="space-y-1">
          <h2 className="text-xl font-semibold text-slate-950">{title}</h2>
          <p className="text-sm text-slate-600">{subtitle}</p>
        </div>
      </div>
      {children}
    </section>
  )
}

function KeyValue({
  label,
  value,
  valueClassName,
}: {
  label: string
  value: string
  valueClassName?: string
}) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className={cn('text-sm font-medium text-slate-900', valueClassName)}>{value}</p>
    </div>
  )
}

function ServiceRow({
  icon: Icon,
  name,
  service,
}: {
  icon: React.ElementType
  name: string
  service: RemoteServiceStatus
}) {
  const models = service.models?.length ?? 0

  return (
    <div className="min-w-0 space-y-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Icon size={15} className="text-slate-500" />
            {name}
          </p>
          <p className="truncate text-xs text-slate-500">{hostLabel(service.baseUrl)}</p>
        </div>
        <div className="shrink-0">
          <StatusPill ok={service.available}>{service.available ? 'Disponible' : service.configured ? 'Sin respuesta' : 'No configurado'}</StatusPill>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 text-sm text-slate-600 sm:grid-cols-2">
        <KeyValue label="Versión" value={service.version ?? 'Sin dato'} valueClassName="font-semibold" />
        <KeyValue label="Endpoint" value={service.baseUrl || 'Sin configurar'} valueClassName="break-all text-xs leading-5 text-slate-600" />
        {service.models ? <KeyValue label="Modelos detectados" value={String(models)} /> : null}
        {service.reason ? <KeyValue label="Estado" value={service.reason} valueClassName="text-xs leading-5 text-slate-600" /> : null}
      </div>
    </div>
  )
}

function RemoteEmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 p-5">
      <p className="text-sm font-semibold text-slate-900">Sin scrape todavía</p>
      <p className="mt-2 text-sm leading-6 text-slate-500">
        El nodo remoto sigue mostrando el estado de OpenClaw y Ollama, pero las métricas de CPU, RAM y disco aparecerán cuando Prometheus quede configurado.
      </p>
    </div>
  )
}

function AppStat({
  label,
  value,
  helper,
}: {
  label: string
  value: string | number
  helper: string
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-slate-950">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{helper}</p>
    </div>
  )
}

function DomainCard({
  eyebrow,
  title,
  description,
  ok,
  icon: Icon,
}: {
  eyebrow: string
  title: string
  description: string
  ok: boolean
  icon: React.ElementType
}) {
  return (
    <div className={cn(
      'rounded-2xl border p-4 shadow-sm transition-colors',
      ok ? 'border-emerald-200 bg-emerald-50/70 shadow-emerald-100/40' : 'border-rose-200 bg-rose-50/70 shadow-rose-100/40'
    )}>
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">{eyebrow}</p>
          <p className="text-lg font-semibold text-slate-950">{title}</p>
          <p className="text-sm leading-6 text-slate-600">{description}</p>
        </div>
        <div className={cn(
          'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border',
          ok ? 'border-emerald-200 bg-white text-emerald-600' : 'border-rose-200 bg-white text-rose-600'
        )}>
          <Icon size={18} />
        </div>
      </div>
    </div>
  )
}

function SourceCard({
  icon: Icon,
  title,
  detail,
}: {
  icon: React.ElementType
  title: string
  detail: string
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="flex items-center gap-2 text-sm font-semibold text-white">
        <Icon size={15} />
        {title}
      </p>
      <p className="mt-2 text-sm leading-6 text-slate-300">{detail}</p>
    </div>
  )
}

function CloudPanel({
  data,
  appHealthy,
}: {
  data: InfraSnapshot
  appHealthy: boolean
}) {
  return (
    <div className="grid items-start grid-cols-1 gap-4 xl:grid-cols-[1.08fr_0.92fr]">
      <SectionCard
        eyebrow="Capa cloud"
        title="Droplet DO"
        subtitle="Capacidad del servidor principal donde corre ebuddy y aterriza cada deploy."
        accent="bg-white"
      >
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill ok={data.droplet.available}>{data.droplet.available ? 'Con datos oficiales' : 'Sin lectura'}</StatusPill>
            <span className="text-sm text-slate-500">
              {data.droplet.available ? 'Fuente oficial: DigitalOcean Monitoring.' : (data.droplet.reason ?? 'DigitalOcean Monitoring no disponible')}
            </span>
          </div>

          <UsageStack cpu={data.droplet.cpu} ram={data.droplet.ram} disk={data.droplet.disk} />

          <div className="grid grid-cols-1 gap-4 border-t border-slate-200 pt-4 sm:grid-cols-2">
            <KeyValue label="Droplet ID" value={data.droplet.hostId ?? 'No resuelto'} />
            <KeyValue label="Ventana" value={`Últimos ${data.droplet.windowMinutes ?? 30} min`} />
          </div>
        </div>
      </SectionCard>

      <SectionCard
        eyebrow="Aplicación"
        title="App ebuddy"
        subtitle="Salud operativa, DB y señales de valor sin mezclar host con producto."
        accent="bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)]"
      >
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill ok={appHealthy}>{appHealthy ? 'Operativa' : 'Degradada'}</StatusPill>
            <StatusPill ok={data.app.db === 'ok'}>{data.app.db === 'ok' ? 'DB conectada' : 'DB con error'}</StatusPill>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <AppStat label="Tickets activos" value={data.app.activeTickets} helper="Backlog no archivado." />
            <AppStat label="Done 7d" value={data.app.completedLast7d} helper="Entrega útil semanal." />
            <AppStat label="Creados 24h" value={data.app.createdLast24h} helper="Movimiento reciente." />
            <AppStat label="Calendarios" value={data.app.connectedCalendars} helper="Integraciones activas." />
          </div>

          <div className="grid grid-cols-1 gap-4 border-t border-slate-200 pt-4 sm:grid-cols-2">
            <KeyValue label="Última captura" value={fmtTime(data.app.lastCaptureAt)} />
            <KeyValue label="Lectura" value={data.app.reason ?? 'La app responde y la DB reporta actividad.'} />
          </div>
        </div>
      </SectionCard>
    </div>
  )
}

function OnPremPanel({
  diagnostics,
  openclaw,
  ollama,
}: {
  diagnostics: DiagnosticsTarget
  openclaw: RemoteServiceStatus
  ollama: RemoteServiceStatus
}) {
  return (
    <div className="grid items-start grid-cols-1 gap-4">
      <SectionCard
        eyebrow="On-prem"
        title="elitemini"
        subtitle="Nodo remoto con IA, dependencias locales y dos rutas de observabilidad."
        accent="bg-[linear-gradient(180deg,#ffffff_0%,#fbf8ff_100%)]"
      >
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill ok={diagnostics.available}>{diagnostics.available ? 'Host con métricas' : 'Host sin scrape'}</StatusPill>
            <span className="text-sm text-slate-500">{diagnostics.reason ?? 'Prometheus está leyendo el host remoto.'}</span>
          </div>

          {diagnostics.available
            ? <UsageStack cpu={diagnostics.cpu} ram={diagnostics.ram} disk={diagnostics.disk} />
            : <RemoteEmptyState />}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <ServiceRow icon={Workflow} name="OpenClaw" service={openclaw} />
            <ServiceRow icon={Bot} name="Ollama" service={ollama} />
          </div>
        </div>
      </SectionCard>

    </div>
  )
}

export function InfraDashboard({ initial }: { initial: InfraSnapshot }) {
  const [data, setData] = useState(initial)
  const [loading, setLoading] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(new Date(initial.ts))
  const [activeView, setActiveView] = useState<'cloud' | 'onprem'>('cloud')

  async function refresh() {
    setLoading(true)
    try {
      const res = await fetch('/api/infra/metrics')
      if (!res.ok) return
      const json = await res.json() as { data: InfraSnapshot }
      setData(json.data)
      setLastUpdate(new Date(json.data.ts))
    } finally {
      setLoading(false)
    }
  }

  const appHealthy = data.app.health === 'ok' && data.app.db === 'ok'
  const cloudHealthy = data.droplet.available && appHealthy
  const onPremHealthy = data.services.openclaw.available && data.services.ollama.available
  const executiveSignal = [data.droplet.available, appHealthy, data.services.openclaw.available, data.services.ollama.available]
    .filter(Boolean).length

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,#f5fbff_0%,#ffffff_42%,#f8f5ff_100%)] p-6 shadow-[0_20px_60px_-32px_rgba(15,23,42,0.35)]">
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-5">
            <div className="space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Infra</p>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">Infraestructura operativa</h1>
              <p className="max-w-2xl text-sm leading-7 text-slate-600">
                Un cockpit dividido por dominios reales de operación. Cloud concentra Droplet y app. On-prem muestra el estado del nodo remoto donde viven OpenClaw y Ollama.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <DomainCard
                eyebrow="Resumen ejecutivo"
                title={`${executiveSignal}/4 señales en verde`}
                description="Un vistazo rápido a host principal, app, gateway IA y modelos locales antes de entrar al detalle."
                ok={executiveSignal >= 3}
                icon={Sparkles}
              />
              <DomainCard
                eyebrow="Última lectura"
                title={lastUpdate.toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit', second: '2-digit' })}
                description="Timestamp del snapshot para saber si sigues leyendo estado fresco o una foto vieja."
                ok
                icon={CalendarClock}
              />
            </div>
          </div>

          <div className="rounded-[24px] border border-slate-200/80 bg-white/80 p-4 backdrop-blur">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Navegación</p>
                <p className="text-lg font-semibold text-slate-950">Dominios operativos</p>
                <p className="text-sm leading-6 text-slate-500">Cambia de plano sin perder el estado global.</p>
              </div>
              <button
                onClick={refresh}
                disabled={loading}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60"
              >
                <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
                Actualizar
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3">
              <TabButton
                active={activeView === 'cloud'}
                icon={Cloud}
                title="Cloud"
                caption="Droplet, app y actividad útil en una sola lectura."
                onClick={() => setActiveView('cloud')}
              />
              <TabButton
                active={activeView === 'onprem'}
                icon={Orbit}
                title="On-prem"
                caption="elitemini, OpenClaw, Ollama y observabilidad remota."
                onClick={() => setActiveView('onprem')}
              />
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            icon={Cloud}
            label="Droplet"
            value={data.droplet.available ? fmtPct(data.droplet.cpu) : 'Sin datos'}
            helper={data.droplet.available ? 'CPU total normalizada desde DigitalOcean Monitoring.' : (data.droplet.reason ?? 'Monitoring no disponible')}
            ok={data.droplet.available}
          />
          <SummaryCard
            icon={Database}
            label="App"
            value={appHealthy ? 'Salud OK' : 'Degradada'}
            helper={appHealthy ? `${data.app.activeTickets} tickets activos y DB disponible.` : (data.app.reason ?? 'Revisar salud de la app')}
            ok={appHealthy}
          />
          <SummaryCard
            icon={Workflow}
            label="OpenClaw"
            value={openClawSummaryValue(data.services.openclaw)}
            helper={data.services.openclaw.available ? 'Gateway IA alcanzable desde ebuddy.' : (data.services.openclaw.reason ?? 'Sin respuesta')}
            ok={data.services.openclaw.available}
          />
          <SummaryCard
            icon={BrainCircuit}
            label="Ollama"
            value={data.services.ollama.available ? `${data.services.ollama.models?.length ?? 0} modelos` : 'No disponible'}
            helper={data.services.ollama.available ? 'Modelos locales detectados en el nodo remoto.' : (data.services.ollama.reason ?? 'Sin respuesta')}
            ok={data.services.ollama.available}
          />
        </div>
      </section>

      {activeView === 'cloud' ? (
        <CloudPanel data={data} appHealthy={appHealthy} />
      ) : (
        <OnPremPanel
          diagnostics={data.diagnostics.targets.elitemini}
          openclaw={data.services.openclaw}
          ollama={data.services.ollama}
        />
      )}
    </div>
  )
}
