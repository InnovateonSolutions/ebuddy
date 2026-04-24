import { requireCapability } from '@/lib/auth/permissions'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { asc } from 'drizzle-orm'
import { apiSuccess } from '@/lib/utils'

export async function GET(request: Request) {
  const authz = await requireCapability('users.manage', request, {
    action: 'users.list',
    resource: '/api/admin/users',
  })
  if ('response' in authz) return authz.response

  const rows = await db
    .select({ id: users.id, email: users.email, role: users.role, createdAt: users.createdAt })
    .from(users)
    .orderBy(asc(users.createdAt))

  return apiSuccess(rows)
}
