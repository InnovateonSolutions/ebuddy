'use client'

import { useState } from 'react'
import { RefreshCw, Server, Cpu, HardDrive, MemoryStick } from 'lucide-react'
import { cn } from '@/lib/utils'

interface InstanceMetrics {
  available: boolean
  cpu?: number
  ram?: { pct: number; used: number; total: number }
  disk?: { pct: number; used: number; total: number }
}

interface MetricsData {
  droplet: InstanceMetrics
  elitemini: InstanceMetrics
  ts: string
}

function fmt(bytes: number) {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`
  return `${(bytes / 1e6).toFixed(0)} MB`
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

function InstanceCard({ name, label, metrics }: { name: string; label: string; metrics: InstanceMetrics }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Server size={15} className="text-slate-400" />
          <span className="text-sm font-semibold text-slate-800">{label}</span>
        </div>
        <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', metrics.available ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600')}>
          {metrics.available ? 'Online' : 'Sin datos'}
        </span>
      </div>

      {metrics.available && metrics.cpu !== undefined && metrics.ram && metrics.disk ? (
        <div className="space-y-3">
          <MetricRow icon={Cpu} label="CPU" pct={metrics.cpu} detail={`${metrics.cpu}% uso promedio`} />
          <MetricRow icon={MemoryStick} label="RAM" pct={metrics.ram.pct} detail={`${fmt(metrics.ram.used)} / ${fmt(metrics.ram.total)}`} />
          <MetricRow icon={HardDrive} label="Disco" pct={metrics.disk.pct} detail={`${fmt(metrics.disk.used)} / ${fmt(metrics.disk.total)}`} />
        </div>
      ) : (
        <p className="text-xs text-slate-400">
          {metrics.available ? 'Cargando...' : `Node Exporter no alcanzable en ${name}`}
        </p>
      )}
    </div>
  )
}

export function InfraDashboard({ initial }: { initial: MetricsData }) {
  const [data, setData] = useState<MetricsData>(initial)
  const [loading, setLoading] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(new Date(initial.ts))

  async function refresh() {
    setLoading(true)
    try {
      const res = await fetch('/api/infra/metrics')
      const json = await res.json() as { data: MetricsData }
      setData(json.data)
      setLastUpdate(new Date(json.data.ts))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Infraestructura</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Actualizado: {lastUpdate.toLocaleTimeString('es-MX')}
          </p>
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-60"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Actualizar
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <InstanceCard name="localhost:9100" label="Droplet DO" metrics={data.droplet} />
        <InstanceCard name="100.80.59.3:9100" label="elitemini" metrics={data.elitemini} />
      </div>

      <p className="text-xs text-slate-400">
        Métricas vía Prometheus + Node Exporter. Sin histórico — solo estado actual.
      </p>
    </div>
  )
}
