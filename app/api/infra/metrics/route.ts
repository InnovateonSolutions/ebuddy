export const dynamic = 'force-dynamic'

import { auth } from '@/lib/auth/config'
import { apiSuccess, apiError } from '@/lib/utils'

const PROMETHEUS_URL = (process.env.PROMETHEUS_URL ?? 'http://localhost:9090').replace(/\/$/, '')

const QUERIES = {
  cpu: 'avg(rate(node_cpu_seconds_total{mode!="idle"}[2m])) by (instance) * 100',
  ram: '(1 - node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes) * 100',
  disk: '(1 - node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"}) * 100',
  ram_used: 'node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes',
  ram_total: 'node_memory_MemTotal_bytes',
  disk_used: 'node_filesystem_size_bytes{mountpoint="/"} - node_filesystem_avail_bytes{mountpoint="/"}',
  disk_total: 'node_filesystem_size_bytes{mountpoint="/"}',
}

async function query(q: string): Promise<Record<string, number>> {
  const url = `${PROMETHEUS_URL}/api/v1/query?query=${encodeURIComponent(q)}`
  const res = await fetch(url, { signal: AbortSignal.timeout(4000) })
  if (!res.ok) return {}
  const data = await res.json() as {
    status: string
    data: { result: { metric: { instance: string }; value: [number, string] }[] }
  }
  if (data.status !== 'success') return {}
  return Object.fromEntries(
    data.data.result.map((r) => [r.metric.instance, parseFloat(r.value[1])])
  )
}

function instanceMetrics(instance: string, results: Record<string, Record<string, number>>) {
  const cpu = results.cpu?.[instance]
  if (cpu === undefined) return { available: false }
  return {
    available: true,
    cpu: Math.round(cpu * 10) / 10,
    ram: { pct: Math.round((results.ram?.[instance] ?? 0) * 10) / 10, used: results.ram_used?.[instance] ?? 0, total: results.ram_total?.[instance] ?? 0 },
    disk: { pct: Math.round((results.disk?.[instance] ?? 0) * 10) / 10, used: results.disk_used?.[instance] ?? 0, total: results.disk_total?.[instance] ?? 0 },
  }
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return apiError('No autorizado', 'UNAUTHORIZED', 401)

  const DROPLET_INSTANCE = process.env.DROPLET_INSTANCE ?? 'localhost:9100'
  const ELITEMINI_INSTANCE = process.env.ELITEMINI_INSTANCE ?? '100.80.59.3:9100'

  try {
    const results = Object.fromEntries(
      await Promise.all(
        Object.entries(QUERIES).map(async ([k, q]) => [k, await query(q)])
      )
    ) as Record<string, Record<string, number>>

    return apiSuccess({
      droplet: instanceMetrics(DROPLET_INSTANCE, results),
      elitemini: instanceMetrics(ELITEMINI_INSTANCE, results),
      ts: new Date().toISOString(),
    })
  } catch {
    return apiSuccess({
      droplet: { available: false },
      elitemini: { available: false },
      ts: new Date().toISOString(),
    })
  }
}
