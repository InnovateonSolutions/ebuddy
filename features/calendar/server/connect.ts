import { db } from '@/lib/db'
import { calendarTokens } from '@/lib/db/schema'
import { encryptSecret } from '@/lib/secrets'
import { logEvent } from '@/lib/utils'
import { exchangeCodeForTokens as exchangeGoogle } from './google'
import { exchangeCodeForTokens as exchangeMicrosoft } from './microsoft'

export async function connectGoogleCalendar(userId: string, code: string): Promise<void> {
  const tokens = await exchangeGoogle(code)

  await db
    .insert(calendarTokens)
    .values({
      userId,
      provider: 'GOOGLE',
      accessToken: encryptSecret(tokens.access_token),
      refreshToken: encryptSecret(tokens.refresh_token),
      expiresAt: new Date(tokens.expires_at),
    })
    .onConflictDoUpdate({
      target: [calendarTokens.userId, calendarTokens.provider],
      set: {
        accessToken: encryptSecret(tokens.access_token),
        refreshToken: encryptSecret(tokens.refresh_token),
        expiresAt: new Date(tokens.expires_at),
        updatedAt: new Date(),
      },
    })

  logEvent('calendar.connected', { userId, provider: 'GOOGLE' })
}

export async function connectMicrosoftCalendar(userId: string, code: string): Promise<void> {
  const tokens = await exchangeMicrosoft(code)

  await db
    .insert(calendarTokens)
    .values({
      userId,
      provider: 'MICROSOFT',
      accessToken: encryptSecret(tokens.access_token),
      refreshToken: encryptSecret(tokens.refresh_token),
      expiresAt: new Date(tokens.expires_at),
    })
    .onConflictDoUpdate({
      target: [calendarTokens.userId, calendarTokens.provider],
      set: {
        accessToken: encryptSecret(tokens.access_token),
        refreshToken: encryptSecret(tokens.refresh_token),
        expiresAt: new Date(tokens.expires_at),
        updatedAt: new Date(),
      },
    })

  logEvent('calendar.connected', { userId, provider: 'MICROSOFT' })
}
