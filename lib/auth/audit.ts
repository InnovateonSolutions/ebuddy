import { db } from '@/lib/db'
import { privilegedAccessAudit } from '@/lib/db/schema'
import type { Capability } from '@/lib/auth/permissions'

type PrivilegedAccessOutcome = 'allowed' | 'denied'

export async function logPrivilegedAccess(input: {
  userId: string
  capability: Capability
  action: string
  resource: string
  outcome: PrivilegedAccessOutcome
  details?: string
}) {
  if (!('insert' in db)) return

  await db.insert(privilegedAccessAudit).values({
    userId: input.userId,
    capability: input.capability,
    action: input.action,
    resource: input.resource,
    outcome: input.outcome,
    details: input.details ?? null,
  })
}
