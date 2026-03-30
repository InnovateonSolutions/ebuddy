import { exchangeCodeForTokens } from '@/lib/calendar/microsoft'
import { createClient } from '@/lib/supabase/server'
import { logEvent } from '@/lib/utils'
import { env } from '@/lib/env'
import type { CalendarToken } from '@/types/database'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  if (error || !code || !state) {
    return Response.redirect(`${env.appUrl}/settings?calendar_error=microsoft`)
  }

  try {
    const tokens = await exchangeCodeForTokens(code)
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user || user.id !== state) {
      return Response.redirect(`${env.appUrl}/settings?calendar_error=mismatch`)
    }

    await (supabase.from('calendar_tokens') as unknown as {
      upsert: (values: CalendarToken) => Promise<{ error: unknown }>
    }).upsert({
      user_id: user.id,
      provider: 'MICROSOFT',
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: tokens.expires_at,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    logEvent('calendar.connected', { userId: user.id, provider: 'MICROSOFT' })
    return Response.redirect(`${env.appUrl}/settings?calendar_connected=microsoft`)
  } catch (err) {
    console.error('Microsoft calendar callback error:', err)
    return Response.redirect(`${env.appUrl}/settings?calendar_error=microsoft`)
  }
}
