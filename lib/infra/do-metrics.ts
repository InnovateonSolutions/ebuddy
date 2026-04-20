import { env } from '@/lib/env'
import type { DigitalOceanDropletMetrics } from '@/lib/infra/types'

const DO_API_BASE_URL = 'https://api.digitalocean.com'
const DO_METADATA_BASE_URL = 'http://169.254.169.254/metadata/v1'
const WINDOW_MINUTES = 30

interface MetricSeries {
  metric: Record<string, string>
  values: [number | string, string][]
}

interface MonitoringResponse {
  status: 'success' | 'error'
  data?: {
    resultType: 'matrix'
    result: MetricSeries[]
  }
}

function round(value: number) {
  return Math.round(value * 10) / 10
}

function parseLatestValue(series: MetricSeries | undefined) {
  const last = series?.values?.at(-1)?.[1]
  if (!last) return null
  const parsed = Number.parseFloat(last)
  return Number.isFinite(parsed) ? parsed : null
}

function pickFilesystemSeries(series: MetricSeries[]) {
  return series.find((item) => item.metric.mountpoint === '/') ?? series[0]
}

async function getDropletId() {
  if (process.env.DO_DROPLET_ID) return process.env.DO_DROPLET_ID

  try {
    const res = await fetch(`${DO_METADATA_BASE_URL}/id`, {
      signal: AbortSignal.timeout(1500),
      cache: 'no-store',
    })
    if (!res.ok) return null
    const dropletId = (await res.text()).trim()
    return dropletId || null
  } catch {
    return null
  }
}

async function fetchMetricSeries(path: string, dropletId: string, token: string) {
  const end = Math.floor(Date.now() / 1000)
  const start = end - WINDOW_MINUTES * 60
  const url = new URL(`${DO_API_BASE_URL}${path}`)
  url.searchParams.set('host_id', dropletId)
  url.searchParams.set('start', String(start))
  url.searchParams.set('end', String(end))

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    signal: AbortSignal.timeout(4000),
    cache: 'no-store',
  })

  if (!res.ok) {
    throw new Error(`DigitalOcean respondió ${res.status}`)
  }

  const body = await res.json() as MonitoringResponse
  if (body.status !== 'success') {
    throw new Error('DigitalOcean Monitoring devolvió error')
  }

  return body.data?.result ?? []
}

export async function getDigitalOceanDropletMetrics(): Promise<DigitalOceanDropletMetrics> {
  const token = env.doMonitoringToken
  if (!token) {
    return {
      available: false,
      source: 'digitalocean',
      reason: 'Falta DO_MONITORING_TOKEN para consultar DigitalOcean Monitoring',
    }
  }

  const dropletId = await getDropletId()
  if (!dropletId) {
    return {
      available: false,
      source: 'digitalocean',
      reason: 'No se pudo resolver el Droplet ID desde el runtime',
    }
  }

  try {
    const [cpuSeries, memoryAvailableSeries, memoryTotalSeries, diskFreeSeries, diskSizeSeries] = await Promise.all([
      fetchMetricSeries('/v2/monitoring/metrics/droplet/cpu', dropletId, token),
      fetchMetricSeries('/v2/monitoring/metrics/droplet/memory_available', dropletId, token),
      fetchMetricSeries('/v2/monitoring/metrics/droplet/memory_total', dropletId, token),
      fetchMetricSeries('/v2/monitoring/metrics/droplet/filesystem_free', dropletId, token),
      fetchMetricSeries('/v2/monitoring/metrics/droplet/filesystem_size', dropletId, token),
    ])

    const cpu = parseLatestValue(cpuSeries[0])
    const memoryAvailable = parseLatestValue(memoryAvailableSeries[0])
    const memoryTotal = parseLatestValue(memoryTotalSeries[0])
    const diskFree = parseLatestValue(pickFilesystemSeries(diskFreeSeries))
    const diskTotal = parseLatestValue(pickFilesystemSeries(diskSizeSeries))

    if (
      cpu === null ||
      memoryAvailable === null ||
      memoryTotal === null ||
      diskFree === null ||
      diskTotal === null
    ) {
      return {
        available: false,
        source: 'digitalocean',
        hostId: dropletId,
        reason: 'DigitalOcean Monitoring respondió sin series suficientes',
      }
    }

    const memoryUsed = Math.max(memoryTotal - memoryAvailable, 0)
    const diskUsed = Math.max(diskTotal - diskFree, 0)

    return {
      available: true,
      source: 'digitalocean',
      hostId: dropletId,
      windowMinutes: WINDOW_MINUTES,
      cpu: round(cpu),
      ram: {
        pct: round(memoryTotal > 0 ? (memoryUsed / memoryTotal) * 100 : 0),
        used: memoryUsed,
        total: memoryTotal,
      },
      disk: {
        pct: round(diskTotal > 0 ? (diskUsed / diskTotal) * 100 : 0),
        used: diskUsed,
        total: diskTotal,
      },
    }
  } catch (error) {
    return {
      available: false,
      source: 'digitalocean',
      hostId: dropletId,
      reason: error instanceof Error ? error.message : 'No se pudieron cargar métricas de DO',
    }
  }
}
