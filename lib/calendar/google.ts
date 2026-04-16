import { google } from 'googleapis'
import { env } from '@/lib/env'
import { isTokenExpired } from '@/lib/utils'
import type { CalendarEvent } from '@/lib/types'
import type { CalendarToken } from '@/lib/db/schema'

const SCOPES = ['https://www.googleapis.com/auth/calendar.readonly']

// ============================================================
// OAuth2 — generar URL de autorización
// ============================================================

export function getGoogleAuthUrl(state?: string): string {
  const oauth2Client = createOAuth2Client()
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent', // siempre pedir consent para obtener refresh_token
    state,
  })
}

// ============================================================
// OAuth2 — intercambiar código por tokens
// ============================================================

export async function exchangeCodeForTokens(code: string): Promise<{
  access_token: string
  refresh_token: string
  expires_at: string
}> {
  const oauth2Client = createOAuth2Client()
  const { tokens } = await oauth2Client.getToken(code)

  if (!tokens.access_token || !tokens.refresh_token) {
    throw new Error('Google no devolvió access_token o refresh_token')
  }

  const expiresAt = new Date(
    tokens.expiry_date ?? Date.now() + 3600 * 1000
  ).toISOString()

  return {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: expiresAt,
  }
}

// ============================================================
// Renovar access_token usando refresh_token
// ============================================================

export async function refreshGoogleToken(
  refreshToken: string
): Promise<{ access_token: string; expires_at: string }> {
  const oauth2Client = createOAuth2Client()
  oauth2Client.setCredentials({ refresh_token: refreshToken })

  const { credentials } = await oauth2Client.refreshAccessToken()

  if (!credentials.access_token) {
    throw new Error('No se pudo renovar el access_token de Google')
  }

  return {
    access_token: credentials.access_token,
    expires_at: new Date(
      credentials.expiry_date ?? Date.now() + 3600 * 1000
    ).toISOString(),
  }
}

// ============================================================
// Leer eventos del calendario
// ============================================================

export async function getGoogleCalendarEvents(
  token: CalendarToken,
  daysAhead = 7
): Promise<{ events: CalendarEvent[]; newToken?: Partial<CalendarToken> }> {
  const oauth2Client = createOAuth2Client()

  let accessToken = token.accessToken
  let newToken: Partial<CalendarToken> | undefined

  // Renovar token si está por expirar
  if (isTokenExpired(token.expiresAt)) {
    const refreshed = await refreshGoogleToken(token.refreshToken)
    accessToken = refreshed.access_token
    newToken = {
      accessToken: refreshed.access_token,
      expiresAt: new Date(refreshed.expires_at),
    }
  }

  oauth2Client.setCredentials({ access_token: accessToken })

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

  const now = new Date()
  const future = new Date(now)
  future.setDate(future.getDate() + daysAhead)

  const response = await calendar.events.list({
    calendarId: 'primary',
    timeMin: now.toISOString(),
    timeMax: future.toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
    maxResults: 50,
    fields: 'items(id,summary,description,location,start,end)',
  })

  const events: CalendarEvent[] = (response.data.items ?? []).map((item) => ({
    id: item.id ?? crypto.randomUUID(),
    title: item.summary ?? '(Sin título)',
    start: item.start?.dateTime ?? item.start?.date ?? now.toISOString(),
    end: item.end?.dateTime ?? item.end?.date ?? now.toISOString(),
    description: item.description ?? undefined,
    location: item.location ?? undefined,
    provider: 'GOOGLE',
    all_day: !item.start?.dateTime,
  }))

  return { events, newToken }
}

// ============================================================
// Helper privado
// ============================================================

function createOAuth2Client() {
  return new google.auth.OAuth2(
    env.googleClientId,
    env.googleClientSecret,
    env.googleRedirectUri
  )
}
