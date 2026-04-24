import { auth } from '@/lib/auth/config'
import { env } from '@/lib/env'
import { connectGoogleCalendar } from '@/features/calendar/server/connect'
import { upsertIntegrationStatus } from '@/lib/integrations/service'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  if (error || !code || !state) {
    return Response.redirect(`${env.appUrl}/settings?calendar_error=google`)
  }

  try {
    const session = await auth()
    if (!session?.user?.id || session.user.id !== state) {
      return Response.redirect(`${env.appUrl}/settings?calendar_error=mismatch`)
    }

    await connectGoogleCalendar(session.user.id, code)
    await upsertIntegrationStatus('google-calendar', 'active', { userId: session.user.id })
    return Response.redirect(`${env.appUrl}/settings?calendar_connected=google`)
  } catch (err) {
    console.error('Google calendar callback error:', err instanceof Error ? err.message : String(err))
    await upsertIntegrationStatus('google-calendar', 'error', { reason: err instanceof Error ? err.message : 'unknown' }).catch(() => {})
    return Response.redirect(`${env.appUrl}/settings?calendar_error=google`)
  }
}
