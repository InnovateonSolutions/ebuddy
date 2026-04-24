import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'

export async function resolveOwnerUserId(): Promise<string | null> {
  const rows = await db.select({ id: users.id }).from(users).where(eq(users.role, 'OWNER')).limit(1)
  if (rows[0]?.id) return rows[0].id

  return process.env.WHATSAPP_OWNER_USER_ID ?? null
}
