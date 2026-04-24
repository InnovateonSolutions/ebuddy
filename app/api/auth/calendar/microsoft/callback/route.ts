import { auth } from '@/lib/auth/config'
import { env } from '@/lib/env'
import { connectMicrosoftCalendar } from '@/features/calendar/server/connect'
import { upsertIntegrationStatus } from '@/lib/integrations/service'

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

    await connectMicrosoftCalendar(session.user.id, code)
    await upsertIntegrationStatus('microsoft-calendar', 'active', { userId: session.user.id })
    return Response.redirect(`${env.appUrl}/settings?calendar_connected=microsoft`)
  } catch (err) {
    console.error('Microsoft calendar callback error:', err instanceof Error ? err.message : String(err))
    await upsertIntegrationStatus('microsoft-calendar', 'error', { reason: err instanceof Error ? err.message : 'unknown' }).catch(() => {})
    return Response.redirect(`${env.appUrl}/settings?calendar_error=microsoft`)
  }
}
