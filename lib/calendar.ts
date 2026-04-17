import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { calendarTokens, type CalendarToken } from '@/lib/db/schema'
import { getGoogleCalendarEvents } from '@/lib/calendar/google'
import { getMicrosoftCalendarEvents } from '@/lib/calendar/microsoft'
import { decryptSecretOrPlaintext, encryptSecret } from '@/lib/secrets'
import type { CalendarEventsResponse } from '@/lib/types'

interface LoadCalendarEventsOptions {
  daysAhead?: number
  throwOnAuthRequired?: boolean
}

async function persistRefreshedToken(
  userId: string,
  provider: 'GOOGLE' | 'MICROSOFT',
  newToken: Partial<CalendarToken>
) {
  const persistedToken = {
    ...newToken,
    ...(newToken.accessToken ? { accessToken: encryptSecret(newToken.accessToken) } : {}),
    ...(newToken.refreshToken ? { refreshToken: encryptSecret(newToken.refreshToken) } : {}),
  }

  await db
    .update(calendarTokens)
    .set(persistedToken)
    .where(
      and(
        eq(calendarTokens.userId, userId),
        eq(calendarTokens.provider, provider)
      )
    )
}

async function loadProviderEvents(
  userId: string,
  token: CalendarToken,
  daysAhead: number,
  throwOnAuthRequired: boolean
) {
  try {
    if (token.provider === 'GOOGLE') {
      const result = await getGoogleCalendarEvents(token, daysAhead)
      if (result.newToken) {
        await persistRefreshedToken(userId, 'GOOGLE', result.newToken)
      }
      return result.events
    }

    const result = await getMicrosoftCalendarEvents(token, daysAhead)
    if (result.newToken) {
      await persistRefreshedToken(userId, 'MICROSOFT', result.newToken)
    }
    return result.events
  } catch (error) {
    if (
      throwOnAuthRequired &&
      String(error).includes('CALENDAR_AUTH_REQUIRED')
    ) {
      throw error
    }
    return []
  }
}

function decryptCalendarToken(token: CalendarToken): CalendarToken {
  return {
    ...token,
    accessToken: decryptSecretOrPlaintext(token.accessToken),
    refreshToken: decryptSecretOrPlaintext(token.refreshToken),
  }
}

export async function loadCalendarEvents(
  userId: string,
  { daysAhead = 7, throwOnAuthRequired = false }: LoadCalendarEventsOptions = {}
): Promise<CalendarEventsResponse> {
  const tokens = await db
    .select()
    .from(calendarTokens)
    .where(eq(calendarTokens.userId, userId))

  if (tokens.length === 0) {
    return { events: [], providers_connected: [] }
  }

  const providersConnected = tokens.map((token) => token.provider)
  const eventGroups = await Promise.all(
    tokens.map((token) =>
      loadProviderEvents(userId, decryptCalendarToken(token), daysAhead, throwOnAuthRequired)
    )
  )

  return {
    events: eventGroups
      .flat()
      .sort((left, right) => left.start.localeCompare(right.start)),
    providers_connected: providersConnected,
  }
}
