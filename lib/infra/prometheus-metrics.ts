import type { DiagnosticsTarget, PrometheusDiagnostics } from '@/lib/infra/types'

const QUERIES = {
  cpu: 'avg(rate(node_cpu_seconds_total{mode!="idle"}[2m])) by (instance) * 100',
  ram: '(1 - node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes) * 100',
  disk: '(1 - node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"}) * 100',
  ram_used: 'node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes',
  ram_total: 'node_memory_MemTotal_bytes',
  disk_used: 'node_filesystem_size_bytes{mountpoint="/"} - node_filesystem_avail_bytes{mountpoint="/"}',
  disk_total: 'node_filesystem_size_bytes{mountpoint="/"}',
} as const

interface PrometheusQueryResponse {
  status: string
  data: {
    result: {
      metric: { instance: string }
      value: [number, string]
    }[]
  }
}

function round(value: number) {
  return Math.round(value * 10) / 10
}

async function queryPrometheus(q: string) {
  const prometheusUrl = (process.env.PROMETHEUS_URL ?? 'http://localhost:9090').replace(/\/$/, '')
  const url = `${prometheusUrl}/api/v1/query?query=${encodeURIComponent(q)}`
  const res = await fetch(url, { signal: AbortSignal.timeout(4000), cache: 'no-store' })
  if (!res.ok) {
    throw new Error(`Prometheus respondió ${res.status}`)
  }

  const body = await res.json() as PrometheusQueryResponse
  if (body.status !== 'success') {
    throw new Error('Prometheus devolvió error')
  }

  return Object.fromEntries(
    body.data.result.map((item) => [item.metric.instance, Number.parseFloat(item.value[1])])
  ) as Record<string, number>
}

function buildTargetMetrics(label: string, instance: string, results: Record<string, Record<string, number>>): DiagnosticsTarget {
  const cpu = results.cpu?.[instance]
  if (cpu === undefined) {
    return {
      label,
      available: false,
      reason: `Sin scrape para ${instance}`,
    }
  }

  return {
    label,
    available: true,
    cpu: round(cpu),
    ram: {
      pct: round(results.ram?.[instance] ?? 0),
      used: results.ram_used?.[instance] ?? 0,
      total: results.ram_total?.[instance] ?? 0,
    },
    disk: {
      pct: round(results.disk?.[instance] ?? 0),
      used: results.disk_used?.[instance] ?? 0,
      total: results.disk_total?.[instance] ?? 0,
    },
  }
}

export async function getPrometheusDiagnostics(): Promise<PrometheusDiagnostics> {
  const dropletInstance = process.env.DROPLET_INSTANCE ?? 'localhost:9100'
  const eliteminiInstance = process.env.ELITEMINI_INSTANCE ?? '100.80.59.3:9100'
  const prometheusUrl = (process.env.PROMETHEUS_URL ?? 'http://localhost:9090').replace(/\/$/, '')

  try {
    const results = Object.fromEntries(
      await Promise.all(
        Object.entries(QUERIES).map(async ([key, query]) => [key, await queryPrometheus(query)])
      )
    ) as Record<string, Record<string, number>>

    const droplet = buildTargetMetrics('Droplet DO', dropletInstance, results)
    const elitemini = buildTargetMetrics('elitemini', eliteminiInstance, results)

    return {
      available: droplet.available || elitemini.available,
      source: 'prometheus',
      reason: droplet.available || elitemini.available
        ? undefined
        : 'Prometheus respondió pero no encontró series para los targets configurados',
      targets: {
        droplet,
        elitemini,
      },
    }
  } catch (error) {
    const reason = error instanceof Error ? error.message : `Prometheus no alcanzable en ${prometheusUrl}`
    return {
      available: false,
      source: 'prometheus',
      reason,
      targets: {
        droplet: { label: 'Droplet DO', available: false, reason },
        elitemini: { label: 'elitemini', available: false, reason },
      },
    }
  }
}
