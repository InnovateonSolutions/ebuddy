import { ConfidentialClientApplication } from '@azure/msal-node'
import { env } from '@/lib/env'
import { isTokenExpired } from '@/lib/utils'
import type { CalendarEvent } from '@/types/api'
import type { CalendarToken } from '@/types/database'

const SCOPES = [
  'https://graph.microsoft.com/Calendars.Read',
  'offline_access',
]

// ============================================================
// OAuth2 MSAL — generar URL de autorización
// ============================================================

export function getMicrosoftAuthUrl(state?: string): string {
  const params = new URLSearchParams({
    client_id: env.microsoftClientId,
    response_type: 'code',
    redirect_uri: env.microsoftRedirectUri,
    scope: SCOPES.join(' '),
    response_mode: 'query',
    ...(state ? { state } : {}),
  })

  return `https://login.microsoftonline.com/${env.microsoftTenantId}/oauth2/v2.0/authorize?${params}`
}

// ============================================================
// OAuth2 MSAL — intercambiar código por tokens
// ============================================================

export async function exchangeCodeForTokens(code: string): Promise<{
  access_token: string
  refresh_token: string
  expires_at: string
}> {
  const body = new URLSearchParams({
    client_id: env.microsoftClientId,
    client_secret: env.microsoftClientSecret,
    code,
    redirect_uri: env.microsoftRedirectUri,
    grant_type: 'authorization_code',
    scope: SCOPES.join(' '),
  })

  const response = await fetch(
    `https://login.microsoftonline.com/${env.microsoftTenantId}/oauth2/v2.0/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Microsoft token exchange falló: ${error}`)
  }

  const data = (await response.json()) as {
    access_token: string
    refresh_token?: string
    expires_in: number
  }

  if (!data.access_token || !data.refresh_token) {
    throw new Error('Microsoft no devolvió access_token o refresh_token')
  }

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString(),
  }
}

// ============================================================
// Renovar access_token
// ============================================================

export async function refreshMicrosoftToken(
  refreshToken: string
): Promise<{ access_token: string; expires_at: string }> {
  const body = new URLSearchParams({
    client_id: env.microsoftClientId,
    client_secret: env.microsoftClientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
    scope: SCOPES.join(' '),
  })

  const response = await fetch(
    `https://login.microsoftonline.com/${env.microsoftTenantId}/oauth2/v2.0/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    }
  )

  if (!response.ok) {
    throw new Error('No se pudo renovar el access_token de Microsoft')
  }

  const data = (await response.json()) as {
    access_token: string
    expires_in: number
  }

  return {
    access_token: data.access_token,
    expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString(),
  }
}

// ============================================================
// Leer eventos del calendario via Microsoft Graph API
// ============================================================

export async function getMicrosoftCalendarEvents(
  token: CalendarToken,
  daysAhead = 7
): Promise<{ events: CalendarEvent[]; newToken?: Partial<CalendarToken> }> {
  let accessToken = token.access_token
  let newToken: Partial<CalendarToken> | undefined

  if (isTokenExpired(token.expires_at)) {
    const refreshed = await refreshMicrosoftToken(token.refresh_token)
    accessToken = refreshed.access_token
    newToken = {
      access_token: refreshed.access_token,
      expires_at: refreshed.expires_at,
    }
  }

  const now = new Date()
  const future = new Date(now)
  future.setDate(future.getDate() + daysAhead)

  const params = new URLSearchParams({
    startDateTime: now.toISOString(),
    endDateTime: future.toISOString(),
    $orderby: 'start/dateTime',
    $top: '50',
    $select: 'id,subject,body,location,start,end,isAllDay',
  })

  const response = await fetch(
    `https://graph.microsoft.com/v1.0/me/calendarView?${params}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  )

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('CALENDAR_AUTH_REQUIRED')
    }
    throw new Error(`Microsoft Graph API error: ${response.status}`)
  }

  const data = (await response.json()) as {
    value: Array<{
      id: string
      subject: string
      body?: { content: string }
      location?: { displayName: string }
      start: { dateTime: string; timeZone: string }
      end: { dateTime: string; timeZone: string }
      isAllDay: boolean
    }>
  }

  const events: CalendarEvent[] = data.value.map((item) => ({
    id: item.id,
    title: item.subject ?? '(Sin título)',
    start: item.start.dateTime,
    end: item.end.dateTime,
    description: item.body?.content ?? undefined,
    location: item.location?.displayName ?? undefined,
    provider: 'MICROSOFT',
    all_day: item.isAllDay,
  }))

  return { events, newToken }
}
