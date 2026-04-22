import { OllamaAIService } from '@/lib/ai/ollama'
import { env } from '@/lib/env'
import type { EliteminiServices, RemoteServiceStatus } from '@/features/infra/server/types'

async function getOpenClawStatus(): Promise<RemoteServiceStatus> {
  const baseUrl = env.openclawBaseUrl.replace(/\/$/, '')
  const token = env.openclawGatewayToken

  if (!baseUrl) {
    return {
      configured: false,
      available: false,
      baseUrl: '',
      reason: 'OPENCLAW_BASE_URL no configurado',
      version: null,
    }
  }

  try {
    const res = await fetch(`${baseUrl}/v1/models`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(4000),
      cache: 'no-store',
    })

    if (!res.ok) {
      return {
        configured: true,
        available: false,
        baseUrl,
        reason: `OpenClaw respondió ${res.status}`,
        version: null,
      }
    }

    return {
      configured: true,
      available: true,
      baseUrl,
      version: null,
    }
  } catch (error) {
    return {
      configured: true,
      available: false,
      baseUrl,
      reason: error instanceof Error ? error.message : 'OpenClaw no disponible',
      version: null,
    }
  }
}

async function getOllamaStatus(): Promise<RemoteServiceStatus> {
  const baseUrl = env.ollamaBaseUrl.replace(/\/$/, '')

  if (!baseUrl) {
    return {
      configured: false,
      available: false,
      baseUrl: '',
      reason: 'OLLAMA_BASE_URL no configurado',
      version: null,
      models: [],
    }
  }

  const available = await OllamaAIService.isAvailable(baseUrl)
  if (!available) {
    return {
      configured: true,
      available: false,
      baseUrl,
      reason: 'Ollama no respondió',
      version: null,
      models: [],
    }
  }

  try {
    const [versionRes, tagsRes] = await Promise.all([
      fetch(`${baseUrl}/api/version`, {
        signal: AbortSignal.timeout(3000),
        cache: 'no-store',
      }),
      fetch(`${baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(3000),
        cache: 'no-store',
      }),
    ])

    const versionData = versionRes.ok
      ? await versionRes.json() as { version?: string }
      : { version: null }
    const tagsData = tagsRes.ok
      ? await tagsRes.json() as { models?: { name: string }[] }
      : { models: [] }

    return {
      configured: true,
      available: true,
      baseUrl,
      version: versionData.version ?? null,
      models: tagsData.models?.map((model) => model.name) ?? [],
    }
  } catch (error) {
    return {
      configured: true,
      available: false,
      baseUrl,
      reason: error instanceof Error ? error.message : 'No se pudo consultar Ollama',
      version: null,
      models: [],
    }
  }
}

export async function getEliteminiServices(): Promise<EliteminiServices> {
  const [openclaw, ollama] = await Promise.all([getOpenClawStatus(), getOllamaStatus()])

  return {
    source: 'elitemini',
    openclaw,
    ollama,
  }
}
