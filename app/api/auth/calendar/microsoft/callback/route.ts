import { exchangeCodeForTokens } from '@/lib/calendar/microsoft'
import { db } from '@/lib/db'
import { calendarTokens } from '@/lib/db/schema'
import { auth } from '@/lib/auth/config'
import { encryptSecret } from '@/lib/secrets'
import { logEvent } from '@/lib/utils'
import { env } from '@/lib/env'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  if (error || !code || !state) {
    return Response.redirect(`${env.appUrl}/settings?calendar_error=microsoft`)
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

    logEvent('calendar.connected', { userId: session.user.id, provider: 'MICROSOFT' })
    return Response.redirect(`${env.appUrl}/settings?calendar_connected=microsoft`)
  } catch (err) {
    console.error('Microsoft calendar callback error:', err)
    return Response.redirect(`${env.appUrl}/settings?calendar_error=microsoft`)
  }
}
