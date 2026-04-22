import type { DiagnosticsTarget, PrometheusDiagnostics } from '@/features/infra/server/types'

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
  const prometheusUrl = process.env.PROMETHEUS_URL?.replace(/\/$/, '')
  if (!prometheusUrl) {
    throw new Error('PROMETHEUS_URL no configurado')
  }
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

function buildUnconfiguredTarget(label: string): DiagnosticsTarget {
  return {
    label,
    available: false,
    reason: 'No configurado',
  }
}

export async function getPrometheusDiagnostics(): Promise<PrometheusDiagnostics> {
  const prometheusUrl = process.env.PROMETHEUS_URL?.replace(/\/$/, '')
  const dropletInstance = process.env.DROPLET_INSTANCE?.trim()
  const eliteminiInstance = process.env.ELITEMINI_INSTANCE?.trim()
  const configured = Boolean(prometheusUrl && (dropletInstance || eliteminiInstance))

  if (!configured) {
    return {
      configured: false,
      available: false,
      source: 'prometheus',
      reason: 'Diagnóstico avanzado opcional no configurado',
      targets: {
        droplet: dropletInstance ? { label: 'Droplet DO', available: false, reason: 'Prometheus no configurado' } : buildUnconfiguredTarget('Droplet DO'),
        elitemini: eliteminiInstance ? { label: 'elitemini', available: false, reason: 'Prometheus no configurado' } : buildUnconfiguredTarget('elitemini'),
      },
    }
  }

  try {
    const results = Object.fromEntries(
      await Promise.all(
        Object.entries(QUERIES).map(async ([key, query]) => [key, await queryPrometheus(query)])
      )
    ) as Record<string, Record<string, number>>

    const droplet = dropletInstance
      ? buildTargetMetrics('Droplet DO', dropletInstance, results)
      : buildUnconfiguredTarget('Droplet DO')
    const elitemini = eliteminiInstance
      ? buildTargetMetrics('elitemini', eliteminiInstance, results)
      : buildUnconfiguredTarget('elitemini')

    return {
      configured: true,
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
      configured: true,
      available: false,
      source: 'prometheus',
      reason,
      targets: {
        droplet: dropletInstance ? { label: 'Droplet DO', available: false, reason } : buildUnconfiguredTarget('Droplet DO'),
        elitemini: eliteminiInstance ? { label: 'elitemini', available: false, reason } : buildUnconfiguredTarget('elitemini'),
      },
    }
  }
}
