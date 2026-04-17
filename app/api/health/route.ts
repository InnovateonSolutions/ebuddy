export const dynamic = 'force-dynamic'

import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'

export async function GET() {
  let dbStatus = 'ok'
  try {
    await db.execute(sql`SELECT 1`)
  } catch {
    dbStatus = 'error'
  }
  const status = dbStatus === 'ok' ? 'ok' : 'degraded'
  return Response.json({ status, db: dbStatus, ts: new Date().toISOString() }, { status: 200 })
}
