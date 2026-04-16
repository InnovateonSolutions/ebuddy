import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db'
import { calendarTokens, userPreferences } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { env } from '@/lib/env'
import { ApiKeySection } from '@/components/api-key-section'

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: { calendar_connected?: string; calendar_error?: string }
}) {
  const session = await auth()
  if (!session?.user?.id) return null

  const [tokens, prefs] = await Promise.all([
    db
      .select({ provider: calendarTokens.provider })
      .from(calendarTokens)
      .where(eq(calendarTokens.userId, session.user.id)),
    db
      .select({
        apiKeyHash: userPreferences.apiKeyHash,
        apiKeyPreview: userPreferences.apiKeyPreview,
      })
      .from(userPreferences)
      .where(eq(userPreferences.userId, session.user.id))
      .then((rows) => rows[0] ?? null),
  ])

  const connectedProviders = new Set(tokens.map((t) => t.provider))
  const googleConnected = connectedProviders.has('GOOGLE')
  const microsoftConnected = connectedProviders.has('MICROSOFT')

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Ajustes</h1>
        <p className="text-slate-500 text-sm mt-0.5">Conecta tus calendarios y gestiona tu acceso</p>
      </div>

      {searchParams.calendar_connected && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-700">
          ✓ Calendario {searchParams.calendar_connected === 'google' ? 'Google' : 'Microsoft'} conectado correctamente.
        </div>
      )}
      {searchParams.calendar_error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          Error al conectar el calendario. Intenta de nuevo.
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100">
        <div className="p-4">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Calendarios</h2>

          {/* Google Calendar */}
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-800">Google Calendar</p>
                <p className="text-xs text-slate-500">
                  {googleConnected ? 'Conectado — solo lectura' : 'No conectado'}
                </p>
              </div>
            </div>
            <a
              href={`${env.appUrl}/api/auth/calendar/google`}
              className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                googleConnected
                  ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {googleConnected ? 'Reconectar' : 'Conectar'}
            </a>
          </div>

          {/* Microsoft Outlook */}
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#0078D4">
                  <path d="M21.17 1H7.83C6.82 1 6 1.82 6 2.83v1.43L13.5 7l7.5-2.74V2.83C21 1.82 20.18 1 21.17 1H21.17zM6 6.45v11.13L13.5 20l7.5-2.42V6.45L13.5 9.19 6 6.45zM3 4.55 0 5.5v13l3-.95V4.55z"/>
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-800">Microsoft Outlook</p>
                <p className="text-xs text-slate-500">
                  {microsoftConnected ? 'Conectado — solo lectura' : 'No conectado'}
                </p>
              </div>
            </div>
            <a
              href={`${env.appUrl}/api/auth/calendar/microsoft`}
              className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                microsoftConnected
                  ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
              }`}
            >
              {microsoftConnected ? 'Reconectar' : 'Conectar'}
            </a>
          </div>
        </div>
      </div>

      <p className="text-xs text-slate-400">
        Solo leemos tu calendario. No modificamos, creamos ni eliminamos eventos.
        Los tokens de acceso se almacenan cifrados.
      </p>

      <ApiKeySection
        hasKey={Boolean(prefs?.apiKeyHash)}
        initialPreview={prefs?.apiKeyPreview ?? null}
      />

      <p className="text-xs text-slate-400 text-center pt-2">
        ebuddy — construido por{' '}
        <span className="font-medium text-slate-500">Martín Cuevas Tavizón</span>
      </p>
    </div>
  )
}
