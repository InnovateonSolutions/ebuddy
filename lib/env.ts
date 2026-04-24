import { assertInternalServiceUrl } from '@/lib/network'

const requiredServerEnvVars = [
  'DATABASE_URL',
  'AUTH_SECRET',
  'OPENAI_API_KEY',
  'ANTHROPIC_API_KEY',
] as const

type RequiredServerKey = (typeof requiredServerEnvVars)[number]

function getEnv(key: RequiredServerKey): string {
  const value = process.env[key]
  if (!value) {
    throw new Error(
      `[ebuddy] Variable de entorno requerida no encontrada: ${key}\n` +
        `Copia .env.example a .env.local y completa el valor.`
    )
  }
  return value
}

const _ollamaBaseUrl = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434'
const _openclawBaseUrl = process.env.OPENCLAW_BASE_URL ?? ''
assertInternalServiceUrl(_ollamaBaseUrl, 'ollama')
assertInternalServiceUrl(_openclawBaseUrl, 'openclaw')

export const env = {
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
  ollamaBaseUrl: _ollamaBaseUrl,
  openclawBaseUrl: _openclawBaseUrl,
  openclawGatewayToken: process.env.OPENCLAW_GATEWAY_TOKEN ?? '',
  openclawHookToken: process.env.OPENCLAW_HOOK_TOKEN ?? '',
  get doMonitoringToken() { return process.env.DO_MONITORING_TOKEN ?? '' },

  // Core — requeridas
  get databaseUrl() { return getEnv('DATABASE_URL') },
  get authSecret() { return getEnv('AUTH_SECRET') },
  get openaiApiKey() { return getEnv('OPENAI_API_KEY') },
  get anthropicApiKey() { return getEnv('ANTHROPIC_API_KEY') },

  // Calendario Google — opcionales
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
  googleRedirectUri: process.env.GOOGLE_REDIRECT_URI,

  // Calendario Microsoft — opcionales
  microsoftClientId: process.env.MICROSOFT_CLIENT_ID,
  microsoftClientSecret: process.env.MICROSOFT_CLIENT_SECRET,
  microsoftRedirectUri: process.env.MICROSOFT_REDIRECT_URI,
  microsoftTenantId: process.env.MICROSOFT_TENANT_ID ?? 'common',

  get isGoogleCalendarEnabled() {
    return !!(this.googleClientId && this.googleClientSecret && this.googleRedirectUri)
  },
  get isMicrosoftCalendarEnabled() {
    return !!(this.microsoftClientId && this.microsoftClientSecret && this.microsoftRedirectUri)
  },
}
