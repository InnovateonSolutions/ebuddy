import { createHash, randomBytes } from 'crypto'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { userPreferences } from '@/lib/db/schema'
import { buildApiKeyPreview } from '@/lib/secrets'
import { apiSuccess, apiError, getUserIdFromRequest, logEvent } from '@/lib/utils'

function hashApiKey(apiKey: string) {
  return createHash('sha256').update(apiKey).digest('hex')
}

// GET /api/user/api-key — devuelve solo metadata segura (sin el secreto)
export async function GET(request: Request) {
  const userId = getUserIdFromRequest(request)
  if (!userId) return apiError('No autorizado', 'UNAUTHORIZED', 401)

  const [prefs] = await db
    .select({
      apiKeyHash: userPreferences.apiKeyHash,
      apiKeyPreview: userPreferences.apiKeyPreview,
    })
    .from(userPreferences)
    .where(eq(userPreferences.userId, userId))

  return apiSuccess({
    hasKey: Boolean(prefs?.apiKeyHash),
    preview: prefs?.apiKeyPreview ?? null,
  })
}

// POST /api/user/api-key — genera una nueva API key y persiste solo hash + preview
export async function POST(request: Request) {
  const userId = getUserIdFromRequest(request)
  if (!userId) return apiError('No autorizado', 'UNAUTHORIZED', 401)

  const newKey = randomBytes(32).toString('hex')
  const apiKeyHash = hashApiKey(newKey)
  const apiKeyPreview = buildApiKeyPreview(newKey)

  await db
    .insert(userPreferences)
    .values({ userId, apiKeyHash, apiKeyPreview })
    .onConflictDoUpdate({
      target: userPreferences.userId,
      set: { apiKeyHash, apiKeyPreview },
    })

  logEvent('api_key.generated', { userId })

  return apiSuccess({ key: newKey, preview: apiKeyPreview })
}
