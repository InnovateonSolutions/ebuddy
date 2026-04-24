import { eq } from 'drizzle-orm'
import { auth } from '@/lib/auth/config'
import { logPrivilegedAccess } from '@/lib/auth/audit'
import { requireAuthenticatedUserId } from '@/lib/auth/request'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { apiError } from '@/lib/utils'

const LEGACY_BOOTSTRAP_OWNER_EMAILS = ['martin.cuevas.t@gmail.com']

export type AppRole = 'OWNER' | 'MEMBER'
export type Capability = 'infra.read' | 'costs.read' | 'gateway.read'

type AuthSession = {
  user?: {
    id?: string
    email?: string | null
    name?: string | null
  }
} | null

const ROLE_CAPABILITIES: Record<AppRole, Capability[]> = {
  OWNER: ['infra.read', 'costs.read', 'gateway.read'],
  MEMBER: [],
}

function bootstrapOwnerEmails() {
  const configured = process.env.OWNER_EMAILS
    ?.split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)

  return configured?.length ? configured : LEGACY_BOOTSTRAP_OWNER_EMAILS
}

function isBootstrapOwnerEmail(email: string | null | undefined) {
  if (!email) return false
  return bootstrapOwnerEmails().includes(email.trim().toLowerCase())
}

async function resolveRole(session: NonNullable<AuthSession>) {
  const rows = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, session.user!.id!))

  const persistedRole = rows[0]?.role ?? 'MEMBER'

  if (persistedRole === 'OWNER') return 'OWNER' as const
  if (!isBootstrapOwnerEmail(session.user?.email)) return 'MEMBER' as const

  await db
    .update(users)
    .set({ role: 'OWNER' })
    .where(eq(users.id, session.user!.id!))

  return 'OWNER' as const
}

export type AuthorizationContext = {
  session: NonNullable<AuthSession>
  userId: string
  role: AppRole
  capabilities: Capability[]
}

type AuditContext = {
  action: string
  resource: string
}

export async function getAuthorizationContext(sessionArg?: AuthSession) {
  const session = (sessionArg ?? await auth()) as AuthSession

  if (!session?.user?.id) {
    return { response: apiError('No autorizado', 'UNAUTHORIZED', 401) } as const
  }

  const role = await resolveRole(session)

  return {
    session,
    userId: session.user.id,
    role,
    capabilities: ROLE_CAPABILITIES[role],
  } satisfies AuthorizationContext
}

export async function requireCapability(capability: Capability, request?: Request, audit?: AuditContext) {
  const authz = await getAuthorizationContext()
  if ('response' in authz) return authz

  if (request) {
    const requestAuth = requireAuthenticatedUserId(request)
    if ('response' in requestAuth) {
      if (audit) {
        await logPrivilegedAccess({
          userId: authz.userId,
          capability,
          action: audit.action,
          resource: audit.resource,
          outcome: 'denied',
          details: 'request_user_mismatch',
        })
      }
      return requestAuth
    }
    if (requestAuth.userId !== authz.userId) {
      if (audit) {
        await logPrivilegedAccess({
          userId: authz.userId,
          capability,
          action: audit.action,
          resource: audit.resource,
          outcome: 'denied',
          details: 'request_user_mismatch',
        })
      }
      return { response: apiError('Prohibido', 'FORBIDDEN', 403) } as const
    }
  }

  if (!authz.capabilities.includes(capability)) {
    if (audit) {
      await logPrivilegedAccess({
        userId: authz.userId,
        capability,
        action: audit.action,
        resource: audit.resource,
        outcome: 'denied',
        details: `role:${authz.role}`,
      })
    }
    return { response: apiError('Prohibido', 'FORBIDDEN', 403) } as const
  }

  if (audit) {
    await logPrivilegedAccess({
      userId: authz.userId,
      capability,
      action: audit.action,
      resource: audit.resource,
      outcome: 'allowed',
      details: `role:${authz.role}`,
    })
  }

  return authz
}
