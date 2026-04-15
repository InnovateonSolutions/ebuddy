import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import Resend from 'next-auth/providers/resend'
import { DrizzleAdapter } from '@auth/drizzle-adapter'
import { db } from '@/lib/db'
import { users, accounts, sessions, verificationTokens } from '@/lib/db/schema'

const isAuthCoreConfigured = !!(process.env.DATABASE_URL && process.env.AUTH_SECRET && db)
const hasGoogleProvider = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
const hasResendProvider = !!process.env.RESEND_API_KEY

const providers = []

if (hasGoogleProvider) {
  providers.push(Google({
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  }))
}

if (hasResendProvider) {
  providers.push(Resend({
    apiKey: process.env.RESEND_API_KEY!,
    from: process.env.EMAIL_FROM ?? 'ebuddy <noreply@ebuddy.io>',
  }))
}

function disabledAuth(arg?: unknown) {
  if (typeof arg === 'function') {
    return async (...args: unknown[]) => {
      const req = args[0] as { auth?: null } | undefined
      if (req && typeof req === 'object') {
        req.auth = null
      }
      return (arg as (...innerArgs: unknown[]) => unknown)(...args)
    }
  }

  return Promise.resolve(null)
}

const disabledHandlers = {
  GET: async () => Response.json({ error: 'Auth not configured' }, { status: 503 }),
  POST: async () => Response.json({ error: 'Auth not configured' }, { status: 503 }),
}

const authConfig = isAuthCoreConfigured
  ? NextAuth({
      secret: process.env.AUTH_SECRET,
      adapter: DrizzleAdapter(db!, {
        usersTable: users,
        accountsTable: accounts,
        sessionsTable: sessions,
        verificationTokensTable: verificationTokens,
      }),
      providers,
      pages: {
        signIn: '/login',
        error: '/login',
      },
      callbacks: {
        // Exponer el userId en el JWT y en la sesión del cliente
        session({ session, user }) {
          if (session.user) {
            session.user.id = user.id
          }
          return session
        },
      },
    })
  : null

export const handlers = (authConfig?.handlers ?? disabledHandlers) as typeof disabledHandlers
export const signIn = authConfig?.signIn
export const signOut = authConfig?.signOut
export const auth: any = authConfig?.auth ?? disabledAuth
export const authStatus = {
  isConfigured: isAuthCoreConfigured,
  hasGoogleProvider,
  hasResendProvider,
}
