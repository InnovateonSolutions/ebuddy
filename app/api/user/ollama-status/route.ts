export const dynamic = 'force-dynamic'

import { auth } from '@/lib/auth/config'
import { OllamaAIService } from '@/lib/ai/ollama'
import { apiSuccess, apiError } from '@/lib/utils'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return apiError('No autorizado', 'UNAUTHORIZED', 401)

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
