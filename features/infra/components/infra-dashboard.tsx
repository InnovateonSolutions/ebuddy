'use client'

import React, { useState } from 'react'
import {
  Activity,
  Bot,
  BrainCircuit,
  CalendarClock,
  CheckCircle2,
  Cloud,
  Cpu,
  Database,
  HardDrive,
  MemoryStick,
  RefreshCw,
  Server,
  ShieldAlert,
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

function KeyValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="text-sm font-medium text-slate-900">{value}</p>
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
    <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50/70 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Icon size={15} className="text-slate-500" />
            {name}
          </p>
          <p className="text-xs text-slate-500">{hostLabel(service.baseUrl)}</p>
        </div>
        <StatusPill ok={service.available}>{service.available ? 'Disponible' : service.configured ? 'Sin respuesta' : 'No configurado'}</StatusPill>
      </div>

      <div className="grid grid-cols-1 gap-3 text-sm text-slate-600 sm:grid-cols-2">
        <KeyValue label="Versión" value={service.version ?? 'Sin dato'} />
        <KeyValue label="Endpoint" value={service.baseUrl || 'Sin configurar'} />
        {service.models ? <KeyValue label="Modelos detectados" value={String(models)} /> : null}
        {service.reason ? <KeyValue label="Estado" value={service.reason} /> : null}
      </div>
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

function EliteminiPanel({
  diagnostics,
  openclaw,
  ollama,
}: {
  diagnostics: DiagnosticsTarget
  openclaw: RemoteServiceStatus
  ollama: RemoteServiceStatus
}) {
  return (
    <SectionCard
      eyebrow="Nodo Remoto"
      title="elitemini"
      subtitle="Host separado del Droplet donde viven OpenClaw y Ollama."
      accent="bg-white"
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill ok={diagnostics.available}>{diagnostics.available ? 'Host con métricas' : 'Host sin scrape'}</StatusPill>
          <span className="text-sm text-slate-500">{diagnostics.reason ?? 'Prometheus está leyendo el host remoto.'}</span>
        </div>

        <UsageStack cpu={diagnostics.cpu} ram={diagnostics.ram} disk={diagnostics.disk} />

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <ServiceRow icon={Workflow} name="OpenClaw" service={openclaw} />
          <ServiceRow icon={Bot} name="Ollama" service={ollama} />
        </div>
      </div>
    </SectionCard>
  )
}

export function InfraDashboard({ initial }: { initial: InfraSnapshot }) {
  const [data, setData] = useState(initial)
  const [loading, setLoading] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(new Date(initial.ts))

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

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-[linear-gradient(135deg,#f8fbff_0%,#ffffff_50%,#f7f8fc_100%)] p-6 shadow-sm shadow-slate-200/50">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-2xl space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Infra</p>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold text-slate-950">Infraestructura operativa</h1>
              <p className="text-sm leading-6 text-slate-600">
                DigitalOcean corre la app principal. elitemini hospeda el stack de IA. Esta vista separa ambos dominios para que los ojos humanos detecten rápido qué host está bien, qué servicio falló y dónde conviene actuar.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
              <StatusPill ok={data.droplet.available}>Droplet DO</StatusPill>
              <StatusPill ok={appHealthy}>App ebuddy</StatusPill>
              <StatusPill ok={data.services.openclaw.available}>OpenClaw</StatusPill>
              <StatusPill ok={data.services.ollama.available}>Ollama</StatusPill>
            </div>
          </div>

          <div className="flex flex-col items-start gap-3 xl:items-end">
            <button
              onClick={refresh}
              disabled={loading}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
              Actualizar
            </button>
            <p className="text-sm text-slate-500">
              Actualizado a las {lastUpdate.toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit', second: '2-digit' })}
            </p>
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

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <SectionCard
          eyebrow="Infraestructura Base"
          title="Droplet DO"
          subtitle="Capacidad del servidor principal donde corre ebuddy."
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

        <EliteminiPanel
          diagnostics={data.diagnostics.targets.elitemini}
          openclaw={data.services.openclaw}
          ollama={data.services.ollama}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <SectionCard
          eyebrow="Aplicación"
          title="App ebuddy"
          subtitle="Salud operativa y actividad útil separadas de la infraestructura."
          accent="bg-white"
        >
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill ok={appHealthy}>{appHealthy ? 'Operativa' : 'Degradada'}</StatusPill>
              <StatusPill ok={data.app.db === 'ok'}>{data.app.db === 'ok' ? 'DB conectada' : 'DB con error'}</StatusPill>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <AppStat label="Tickets activos" value={data.app.activeTickets} helper="Backlog no archivado." />
              <AppStat label="Creados 24h" value={data.app.createdLast24h} helper="Movimiento reciente." />
              <AppStat label="Done 7d" value={data.app.completedLast7d} helper="Entrega semanal." />
              <AppStat label="Calendarios" value={data.app.connectedCalendars} helper="Integraciones activas." />
            </div>

            <div className="grid grid-cols-1 gap-4 border-t border-slate-200 pt-4 sm:grid-cols-2">
              <KeyValue label="Última captura" value={fmtTime(data.app.lastCaptureAt)} />
              <KeyValue label="Lectura" value={data.app.reason ?? 'La app responde y la DB reporta actividad.'} />
            </div>
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="Diagnóstico"
          title="Lectura de fuentes"
          subtitle="Qué dato viene de qué sistema para no mezclar responsabilidades."
          accent="bg-slate-950 text-white"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3">
              <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                <p className="flex items-center gap-2 text-sm font-semibold text-white">
                  <Server size={15} />
                  Droplet y app
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  El Droplet usa DigitalOcean Monitoring para host metrics. La app usa métricas internas de base de datos y actividad.
                </p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                <p className="flex items-center gap-2 text-sm font-semibold text-white">
                  <BrainCircuit size={15} />
                  Stack IA
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  elitemini se observa por dos vías: Prometheus para recursos del host y checks HTTP directos para OpenClaw y Ollama.
                </p>
              </div>
            </div>

            {!data.diagnostics.configured ? (
              <div className="rounded-lg border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-100">
                Prometheus no está configurado, así que el host remoto se mostrará sin métricas aunque OpenClaw u Ollama sí respondan.
              </div>
            ) : null}

            <div className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
              <ShieldAlert size={16} className="mt-0.5 shrink-0" />
              <p>
                Si un servicio remoto cae pero el host sigue con métricas, la interfaz lo va a mostrar como problema de servicio, no como problema del Droplet.
              </p>
            </div>
          </div>
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Cloud size={15} className="text-slate-500" />
            DigitalOcean
          </p>
          <p className="mt-2 text-sm text-slate-500">Host principal, deploy y métricas oficiales del Droplet.</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Workflow size={15} className="text-slate-500" />
            OpenClaw
          </p>
          <p className="mt-2 text-sm text-slate-500">Gateway de mensajería y orquestación IA en el nodo remoto.</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <CalendarClock size={15} className="text-slate-500" />
            Flujo útil
          </p>
          <p className="mt-2 text-sm text-slate-500">Los tickets y la última captura ayudan a saber si el sistema sigue produciendo valor.</p>
        </div>
      </div>
    </div>
  )
}
