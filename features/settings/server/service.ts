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
const DEFAULT_PREFERENCES = {
  timezone: 'America/Tijuana',
  workStart: '08:00',
  workEnd: '19:00',
  aiProvider: 'claude',
  ollamaModel: 'llama3:latest',
} as const

export type PreferencesInput = {
  timezone?: string
  workStart?: string
  workEnd?: string
  aiProvider?: string
  ollamaModel?: string
}

export type PreferencesValidationError = { field: string; message: string }

export class UserPreferencesValidationError extends Error {
  field: string

  constructor(field: string, message: string) {
    super(message)
    this.name = 'UserPreferencesValidationError'
    this.field = field
  }
}

export function validatePreferences(
  input: PreferencesInput,
  current: Partial<Required<PreferencesInput>> = {}
): PreferencesValidationError | null {
  if (input.timezone !== undefined && input.timezone !== '' && !VALID_TIMEZONES.includes(input.timezone as ValidTimezone))
    return { field: 'timezone', message: 'Zona horaria inválida' }

  if (input.workStart !== undefined && input.workStart !== '' && !TIME_RE.test(input.workStart))
    return { field: 'workStart', message: 'workStart inválido (HH:MM)' }

  if (input.workEnd !== undefined && input.workEnd !== '' && !TIME_RE.test(input.workEnd))
    return { field: 'workEnd', message: 'workEnd inválido (HH:MM)' }

  if (input.aiProvider !== undefined && input.aiProvider !== '' && !['claude', 'ollama', 'auto'].includes(input.aiProvider))
    return { field: 'aiProvider', message: 'aiProvider inválido' }

  if (input.ollamaModel !== undefined && input.ollamaModel.trim().length === 0)
    return { field: 'ollamaModel', message: 'ollamaModel no puede estar vacío' }

  const hasWorkRangeContext =
    (input.workStart !== undefined && input.workStart !== '') ||
    (input.workEnd !== undefined && input.workEnd !== '') ||
    current.workStart !== undefined ||
    current.workEnd !== undefined

  if (hasWorkRangeContext) {
    const effectiveWorkStart = (input.workStart && input.workStart !== '' ? input.workStart : current.workStart)
    const effectiveWorkEnd = (input.workEnd && input.workEnd !== '' ? input.workEnd : current.workEnd)

    if (effectiveWorkStart && effectiveWorkEnd && effectiveWorkStart >= effectiveWorkEnd) {
      return { field: 'workEnd', message: 'workEnd debe ser posterior a workStart' }
    }
  }

  return null
}

export async function updateUserPreferences(
  userId: string,
  input: PreferencesInput
): Promise<string[]> {
  const [current] = await db
    .select({
      timezone: userPreferences.timezone,
      workStart: userPreferences.workStart,
      workEnd: userPreferences.workEnd,
      aiProvider: userPreferences.aiProvider,
      ollamaModel: userPreferences.ollamaModel,
    })
    .from(userPreferences)
    .where(eq(userPreferences.userId, userId))

  const validationError = validatePreferences(input, current ?? DEFAULT_PREFERENCES)
  if (validationError) {
    throw new UserPreferencesValidationError(validationError.field, validationError.message)
  }

  const updates: Record<string, string> = {}
  if (input.timezone) updates.timezone = input.timezone
  if (input.workStart) updates.workStart = input.workStart
  if (input.workEnd) updates.workEnd = input.workEnd
  if (input.aiProvider) updates.aiProvider = input.aiProvider
  if (input.ollamaModel) updates.ollamaModel = input.ollamaModel.trim()

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
