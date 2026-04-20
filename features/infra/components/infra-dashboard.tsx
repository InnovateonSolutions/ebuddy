'use client'

import { useState } from 'react'
import { Activity, AlertCircle, CheckCircle2, Cpu, Database, HardDrive, MemoryStick, RefreshCw, Server } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DiagnosticsTarget, InfraSnapshot, ResourceUsage } from '@/features/infra/server/types'

function fmtBytes(bytes: number) {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`
  return `${(bytes / 1e6).toFixed(0)} MB`
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

function Bar({ pct, warn = 70, danger = 85 }: { pct: number; warn?: number; danger?: number }) {
  const color = pct >= danger ? 'bg-red-500' : pct >= warn ? 'bg-amber-400' : 'bg-emerald-500'
  return (
    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
      <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${Math.min(pct, 100)}%` }} />
    </div>
  )
}

function MetricRow({ icon: Icon, label, pct, detail }: { icon: React.ElementType; label: string; pct: number; detail: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 text-slate-500">
          <Icon size={11} />
          {label}
        </span>
        <span className="font-medium text-slate-700">{pct}%</span>
      </div>
      <Bar pct={pct} />
      <p className="text-[10px] text-slate-400">{detail}</p>
    </div>
  )
}

function UsageRows({ cpu, ram, disk }: { cpu?: number; ram?: ResourceUsage; disk?: ResourceUsage }) {
  if (cpu === undefined || !ram || !disk) return null

  return (
    <div className="space-y-3">
      <MetricRow icon={Cpu} label="CPU" pct={cpu} detail={`${cpu}% uso actual`} />
      <MetricRow icon={MemoryStick} label="RAM" pct={ram.pct} detail={`${fmtBytes(ram.used)} / ${fmtBytes(ram.total)}`} />
      <MetricRow icon={HardDrive} label="Disco" pct={disk.pct} detail={`${fmtBytes(disk.used)} / ${fmtBytes(disk.total)}`} />
    </div>
  )
}

function SourceBadge({ healthy, text }: { healthy: boolean; text: string }) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium',
      healthy ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
    )}>
      {healthy ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
      {text}
    </span>
  )
}

function SectionHeader({ icon: Icon, title, subtitle }: { icon: React.ElementType; title: string; subtitle: string }) {
  return (
    <div className="space-y-1">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
        <Icon size={13} />
        {title}
      </p>
      <p className="text-sm text-slate-500">{subtitle}</p>
    </div>
  )
}

function DropletCard({ data }: { data: InfraSnapshot['droplet'] }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/40">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Droplet DO</h2>
          <p className="mt-1 text-sm text-slate-500">
            Fuente oficial: DigitalOcean Monitoring
          </p>
        </div>
        <SourceBadge healthy={data.available} text={data.available ? 'Con datos' : 'Sin datos'} />
      </div>

      <div className="mt-5">
        {data.available ? (
          <>
            <UsageRows cpu={data.cpu} ram={data.ram} disk={data.disk} />
            <div className="mt-4 grid grid-cols-1 gap-3 border-t border-slate-100 pt-4 text-xs text-slate-500 sm:grid-cols-2">
              <div>
                <p className="font-medium text-slate-700">Droplet ID</p>
                <p>{data.hostId ?? 'No resuelto'}</p>
              </div>
              <div>
                <p className="font-medium text-slate-700">Ventana</p>
                <p>Últimos {data.windowMinutes ?? 30} min</p>
              </div>
            </div>
          </>
        ) : (
          <p className="text-sm text-slate-500">{data.reason ?? 'DigitalOcean Monitoring no disponible'}</p>
        )}
      </div>
    </div>
  )
}

function DiagnosticTargetCard({ target }: { target: DiagnosticsTarget }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Server size={15} className="text-slate-400" />
          <span className="text-sm font-semibold text-slate-800">{target.label}</span>
        </div>
        <SourceBadge healthy={target.available} text={target.available ? 'Reachable' : 'Sin scrape'} />
      </div>

      <div className="mt-4">
        {target.available ? (
          <UsageRows cpu={target.cpu} ram={target.ram} disk={target.disk} />
        ) : (
          <p className="text-xs text-slate-500">{target.reason ?? 'Node Exporter no alcanzable'}</p>
        )}
      </div>
    </div>
  )
}

function AppMetricCard({ label, value, helper }: { label: string; value: string | number; helper: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{helper}</p>
    </div>
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
      const json = await res.json() as { data: InfraSnapshot }
      setData(json.data)
      setLastUpdate(new Date(json.data.ts))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Infraestructura</h1>
          <p className="mt-1 text-sm text-slate-500">
            Actualizado: {lastUpdate.toLocaleTimeString('es-MX')}
          </p>
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Actualizar
        </button>
      </div>

      <section className="space-y-4">
        <SectionHeader
          icon={Server}
          title="Servidor"
          subtitle="CPU, RAM y disco del Droplet desde DigitalOcean Monitoring."
        />
        <DropletCard data={data.droplet} />
      </section>

      <section className="space-y-4">
        <SectionHeader
          icon={Activity}
          title="Aplicación"
          subtitle="Salud interna y actividad útil de la app separadas de la infraestructura."
        />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <AppMetricCard label="Salud DB" value={data.app.db === 'ok' ? 'OK' : 'Error'} helper={data.app.health === 'ok' ? 'Conectividad vigente' : (data.app.reason ?? 'Degradado')} />
          <AppMetricCard label="Tickets activos" value={data.app.activeTickets} helper="Backlog no archivado" />
          <AppMetricCard label="Creados 24h" value={data.app.createdLast24h} helper="Actividad reciente" />
          <AppMetricCard label="DONE 7d" value={data.app.completedLast7d} helper="Entrega semanal" />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              <Database size={13} />
              Conectividad de app
            </p>
            <div className="mt-3 flex items-center gap-2">
              <SourceBadge healthy={data.app.health === 'ok'} text={data.app.health === 'ok' ? 'Operativa' : 'Degradada'} />
            </div>
            <p className="mt-3 text-sm text-slate-500">
              Calendarios conectados: <span className="font-medium text-slate-700">{data.app.connectedCalendars}</span>
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              <Activity size={13} />
              Última captura
            </p>
            <p className="mt-3 text-lg font-semibold text-slate-900">{fmtTime(data.app.lastCaptureAt)}</p>
            <p className="mt-1 text-sm text-slate-500">Referencia útil para ver si el flujo sigue activo.</p>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <SectionHeader
          icon={Server}
          title="Diagnóstico Técnico"
          subtitle="Reachability de Prometheus + node_exporter para el Droplet y elitemini."
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <DiagnosticTargetCard target={data.diagnostics.targets.droplet} />
          <DiagnosticTargetCard target={data.diagnostics.targets.elitemini} />
        </div>
        {!data.diagnostics.available && data.diagnostics.reason ? (
          <p className="text-sm text-slate-500">{data.diagnostics.reason}</p>
        ) : null}
      </section>

      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-4 text-xs text-slate-500">
        <p>
          Droplet DO: <span className="font-medium text-slate-700">DigitalOcean Monitoring</span>.
          Diagnóstico de hosts: <span className="font-medium text-slate-700">Prometheus + Node Exporter</span>.
          App: <span className="font-medium text-slate-700">DB + actividad interna</span>.
        </p>
      </div>
    </div>
  )
}
