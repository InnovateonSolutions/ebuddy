/**
 * Valida variables de entorno requeridas al startup.
 * Si falta alguna, el servidor falla rápido con un mensaje claro.
 */

// Requeridas para el core de la app (falla al startup si faltan)
const requiredServerEnvVars = [
  'SUPABASE_SERVICE_ROLE_KEY',
  'OPENAI_API_KEY',
  'ANTHROPIC_API_KEY',
] as const

const requiredPublicEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
] as const

type RequiredServerKey = (typeof requiredServerEnvVars)[number]
type RequiredPublicKey = (typeof requiredPublicEnvVars)[number]

function getEnv(key: RequiredServerKey | RequiredPublicKey): string {
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

  // Core — requeridas
  get supabaseServiceRoleKey() { return getEnv('SUPABASE_SERVICE_ROLE_KEY') },
  get openaiApiKey() { return getEnv('OPENAI_API_KEY') },
  get anthropicApiKey() { return getEnv('ANTHROPIC_API_KEY') },

  // Calendario Google — opcionales (feature desactivada si no están)
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
  googleRedirectUri: process.env.GOOGLE_REDIRECT_URI,

  // Calendario Microsoft — opcionales (feature desactivada si no están)
  microsoftClientId: process.env.MICROSOFT_CLIENT_ID,
  microsoftClientSecret: process.env.MICROSOFT_CLIENT_SECRET,
  microsoftRedirectUri: process.env.MICROSOFT_REDIRECT_URI,
  microsoftTenantId: process.env.MICROSOFT_TENANT_ID ?? 'common',

  // Helpers para chequear si los calendarios están configurados
  get isGoogleCalendarEnabled() {
    return !!(this.googleClientId && this.googleClientSecret && this.googleRedirectUri)
  },
  get isMicrosoftCalendarEnabled() {
    return !!(this.microsoftClientId && this.microsoftClientSecret && this.microsoftRedirectUri)
  },
}
