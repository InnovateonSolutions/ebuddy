import { randomBytes } from 'crypto'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { userPreferences } from '@/lib/db/schema'
import { apiSuccess, apiError, getUserIdFromRequest, logEvent } from '@/lib/utils'

// GET /api/user/api-key — devuelve la API key actual (o null si no tiene)
export async function GET(request: Request) {
  const userId = getUserIdFromRequest(request)
  if (!userId) return apiError('No autorizado', 'UNAUTHORIZED', 401)

  const [prefs] = await db
    .select({ apiKey: userPreferences.apiKey })
    .from(userPreferences)
    .where(eq(userPreferences.userId, userId))

  return apiSuccess({ key: prefs?.apiKey ?? null })
}

// POST /api/user/api-key — genera una nueva API key (64 chars hex, 32 bytes)
export async function POST(request: Request) {
  const userId = getUserIdFromRequest(request)
  if (!userId) return apiError('No autorizado', 'UNAUTHORIZED', 401)

  const newKey = randomBytes(32).toString('hex')

  await db
    .insert(userPreferences)
    .values({ userId, apiKey: newKey })
    .onConflictDoUpdate({
      target: userPreferences.userId,
      set: { apiKey: newKey },
    })

  logEvent('api_key.generated', { userId })

  return apiSuccess({ key: newKey })
}
