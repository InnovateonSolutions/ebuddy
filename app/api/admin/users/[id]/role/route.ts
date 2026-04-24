import { requireCapability, requireStepUp } from '@/lib/auth/permissions'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { apiSuccess, apiError } from '@/lib/utils'
import type { AppRole } from '@/lib/auth/permissions'

const VALID_ROLES: AppRole[] = ['OWNER', 'MEMBER']
const STEP_UP_MAX_AGE_SEC = 15 * 60

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authz = await requireCapability('users.manage', request, {
    action: 'users.update_role',
    resource: '/api/admin/users/[id]/role',
  })
  if ('response' in authz) return authz.response

  const stepUp = await requireStepUp(STEP_UP_MAX_AGE_SEC)
  if ('response' in stepUp) return stepUp.response

  const { id } = await params

  let body: { role?: string }
  try {
    body = await request.json()
  } catch {
    return apiError('Body inválido', 'VALIDATION_ERROR', 400)
  }

  if (!body.role || !VALID_ROLES.includes(body.role as AppRole)) {
    return apiError('Rol inválido. Valores permitidos: OWNER, MEMBER', 'VALIDATION_ERROR', 400)
  }

  await db.update(users).set({ role: body.role as AppRole }).where(eq(users.id, id))

  return apiSuccess({ id, role: body.role })
}
