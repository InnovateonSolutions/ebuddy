/**
 * Valida variables de entorno requeridas al startup.
 * Si falta alguna, el servidor falla rápido con un mensaje claro.
 */

const serverEnvVars = [
  'SUPABASE_SERVICE_ROLE_KEY',
  'OPENAI_API_KEY',
  'ANTHROPIC_API_KEY',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'GOOGLE_REDIRECT_URI',
  'MICROSOFT_CLIENT_ID',
  'MICROSOFT_CLIENT_SECRET',
  'MICROSOFT_REDIRECT_URI',
] as const

const publicEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_APP_URL',
] as const

type ServerEnvKey = (typeof serverEnvVars)[number]
type PublicEnvKey = (typeof publicEnvVars)[number]

function getEnv(key: ServerEnvKey | PublicEnvKey): string {
  const value = process.env[key]
  if (!value) {
    throw new Error(
      `[ebuddy] Variable de entorno requerida no encontrada: ${key}\n` +
        `Copia .env.example a .env.local y completa el valor.`
    )
  }
  return value
}

export const env = {
  // Públicas (seguras para el cliente)
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',

  // Solo servidor
  get supabaseServiceRoleKey() { return getEnv('SUPABASE_SERVICE_ROLE_KEY') },
  get openaiApiKey() { return getEnv('OPENAI_API_KEY') },
  get anthropicApiKey() { return getEnv('ANTHROPIC_API_KEY') },
  get googleClientId() { return getEnv('GOOGLE_CLIENT_ID') },
  get googleClientSecret() { return getEnv('GOOGLE_CLIENT_SECRET') },
  get googleRedirectUri() { return getEnv('GOOGLE_REDIRECT_URI') },
  get microsoftClientId() { return getEnv('MICROSOFT_CLIENT_ID') },
  get microsoftClientSecret() { return getEnv('MICROSOFT_CLIENT_SECRET') },
  get microsoftRedirectUri() { return getEnv('MICROSOFT_REDIRECT_URI') },
  microsoftTenantId: process.env.MICROSOFT_TENANT_ID ?? 'common',
}
