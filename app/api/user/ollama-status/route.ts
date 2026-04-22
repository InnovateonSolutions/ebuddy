export const dynamic = 'force-dynamic'

import { OllamaAIService } from '@/lib/ai/ollama'
import { apiSuccess, apiError } from '@/lib/utils'
import { requireAuthenticatedUserId } from '@/lib/auth/request'

export async function GET(request: Request) {
  const auth = requireAuthenticatedUserId(request)
  if ('response' in auth) return auth.response

  const baseUrl = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434'
  const available = await OllamaAIService.isAvailable(baseUrl)

  let models: string[] = []
  if (available) {
    try {
      const res = await fetch(`${baseUrl.replace(/\/$/, '')}/api/tags`, {
        signal: AbortSignal.timeout(3000),
      })
      if (res.ok) {
        const data = await res.json() as { models?: { name: string }[] }
        models = data.models?.map((m) => m.name) ?? []
      }
    } catch { /* non-critical */ }
  }

  return apiSuccess({ available, models, baseUrl })
}
