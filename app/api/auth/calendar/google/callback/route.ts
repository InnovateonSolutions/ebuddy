import { exchangeCodeForTokens } from '@/lib/calendar/google'
import { db } from '@/lib/db'
import { calendarTokens } from '@/lib/db/schema'
import { auth } from '@/lib/auth/config'
import { logEvent } from '@/lib/utils'
import { env } from '@/lib/env'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state') // userId que pusimos como state
  const error = searchParams.get('error')

  if (error || !code || !state) {
    return Response.redirect(`${env.appUrl}/settings?calendar_error=google`)
  }

  try {
    const session = await auth()
    if (!session?.user?.id || session.user.id !== state) {
      return Response.redirect(`${env.appUrl}/settings?calendar_error=mismatch`)
    }

    const tokens = await exchangeCodeForTokens(code)

    await db
      .insert(calendarTokens)
      .values({
        userId: session.user.id,
        provider: 'GOOGLE',
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: new Date(tokens.expires_at),
      })
      .onConflictDoUpdate({
        target: [calendarTokens.userId, calendarTokens.provider],
        set: {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          expiresAt: new Date(tokens.expires_at),
          updatedAt: new Date(),
        },
      })

    logEvent('calendar.connected', { userId: session.user.id, provider: 'GOOGLE' })
    return Response.redirect(`${env.appUrl}/settings?calendar_connected=google`)
  } catch (err) {
    console.error('Google calendar callback error:', err)
    return Response.redirect(`${env.appUrl}/settings?calendar_error=google`)
  }
}
