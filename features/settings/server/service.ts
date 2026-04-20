import { eq } from 'drizzle-orm'
import { randomBytes } from 'crypto'
import { db } from '@/lib/db'
import { userPreferences } from '@/lib/db/schema'
import { hashApiKey, buildApiKeyPreview } from '@/lib/secrets'
import { logEvent } from '@/lib/utils'

export const VALID_TIMEZONES = [
  'America/Tijuana',
  'America/Los_Angeles',
  'America/Denver',
  'America/Chicago',
  'America/Mexico_City',
  'America/Monterrey',
  'America/New_York',
  'America/Bogota',
  'America/Lima',
  'America/Santiago',
  'America/Argentina/Buenos_Aires',
  'Europe/Madrid',
  'UTC',
] as const

export type ValidTimezone = (typeof VALID_TIMEZONES)[number]

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/

export type PreferencesInput = {
  timezone?: string
  workStart?: string
  workEnd?: string
  aiProvider?: string
  ollamaModel?: string
}

export type PreferencesValidationError = { field: string; message: string }

export function validatePreferences(
  input: PreferencesInput
): PreferencesValidationError | null {
  if (input.timezone !== undefined && !VALID_TIMEZONES.includes(input.timezone as ValidTimezone))
    return { field: 'timezone', message: 'Zona horaria inválida' }

  if (input.workStart !== undefined && !TIME_RE.test(input.workStart))
    return { field: 'workStart', message: 'workStart inválido (HH:MM)' }

  if (input.workEnd !== undefined && !TIME_RE.test(input.workEnd))
    return { field: 'workEnd', message: 'workEnd inválido (HH:MM)' }

  if (input.aiProvider !== undefined && !['claude', 'ollama', 'auto'].includes(input.aiProvider))
    return { field: 'aiProvider', message: 'aiProvider inválido' }

  return null
}

export async function updateUserPreferences(
  userId: string,
  input: PreferencesInput
): Promise<string[]> {
  const updates: Record<string, string> = {}
  if (input.timezone) updates.timezone = input.timezone
  if (input.workStart) updates.workStart = input.workStart
  if (input.workEnd) updates.workEnd = input.workEnd
  if (input.aiProvider) updates.aiProvider = input.aiProvider
  if (input.ollamaModel) updates.ollamaModel = input.ollamaModel

  await db
    .insert(userPreferences)
    .values({ userId, ...updates })
    .onConflictDoUpdate({ target: userPreferences.userId, set: updates })

  return Object.keys(updates)
}

export async function getApiKeyMeta(
  userId: string
): Promise<{ hasKey: boolean; preview: string | null }> {
  const [prefs] = await db
    .select({ apiKeyHash: userPreferences.apiKeyHash, apiKeyPreview: userPreferences.apiKeyPreview })
    .from(userPreferences)
    .where(eq(userPreferences.userId, userId))

  return {
    hasKey: Boolean(prefs?.apiKeyHash),
    preview: prefs?.apiKeyPreview ?? null,
  }
}

export async function generateApiKey(
  userId: string
): Promise<{ key: string; preview: string }> {
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

  return { key: newKey, preview: apiKeyPreview }
}
