import { requireCapability } from '@/lib/auth/permissions'
import { db } from '@/lib/db'
import { privilegedAccessAudit } from '@/lib/db/schema'
import { desc } from 'drizzle-orm'
import { apiSuccess } from '@/lib/utils'

export async function GET(request: Request) {
  const authz = await requireCapability('infra.read', request, {
    action: 'audit.list',
    resource: '/api/admin/audit',
  })
  if ('response' in authz) return authz.response

  const rows = await db
    .select()
    .from(privilegedAccessAudit)
    .orderBy(desc(privilegedAccessAudit.createdAt))
    .limit(50)

  return apiSuccess(rows)
}
