import { exchangeCodeForTokens } from '@/lib/calendar/google'
import { createClient } from '@/lib/supabase/server'
import { logEvent } from '@/lib/utils'
import { env } from '@/lib/env'
import type { CalendarToken } from '@/types/database'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state') // userId que pusimos como state
  const error = searchParams.get('error')

  if (error || !code || !state) {
    return Response.redirect(`${env.appUrl}/settings?calendar_error=google`)
  }

  try {
    const tokens = await exchangeCodeForTokens(code)
    const supabase = await createClient()

    // Verificar que el usuario del state coincide con la sesión actual
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || user.id !== state) {
      return Response.redirect(`${env.appUrl}/settings?calendar_error=mismatch`)
    }

    // Upsert del token (actualiza si ya existe, inserta si no)
    await (supabase.from('calendar_tokens') as unknown as {
      upsert: (values: CalendarToken) => Promise<{ error: unknown }>
    }).upsert({
      user_id: user.id,
      provider: 'GOOGLE',
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: tokens.expires_at,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    logEvent('calendar.connected', { userId: user.id, provider: 'GOOGLE' })
    return Response.redirect(`${env.appUrl}/settings?calendar_connected=google`)
  } catch (err) {
    console.error('Google calendar callback error:', err)
    return Response.redirect(`${env.appUrl}/settings?calendar_error=google`)
  }
}
