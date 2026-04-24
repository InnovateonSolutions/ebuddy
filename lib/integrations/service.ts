import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { integrations } from '@/lib/db/schema'
import type { Integration } from '@/lib/db/schema'

export type IntegrationName =
  | 'openclaw'
  | 'ollama'
  | 'google-calendar'
  | 'microsoft-calendar'
  | 'do-billing'
  | 'do-metrics'

export type IntegrationStatus = 'active' | 'inactive' | 'error'

export async function getIntegrationStatus(name: IntegrationName): Promise<Integration | null> {
  const rows = await db.select().from(integrations).where(eq(integrations.name, name))
  return rows[0] ?? null
}

export async function upsertIntegrationStatus(
  name: IntegrationName,
  status: IntegrationStatus,
  metadata?: Record<string, unknown>
): Promise<void> {
  await db
    .insert(integrations)
    .values({
      name,
      status,
      lastCheckedAt: new Date(),
      metadata: metadata ?? null,
    })
    .onConflictDoUpdate({
      target: integrations.name,
      set: {
        status,
        lastCheckedAt: new Date(),
        metadata: metadata ?? null,
      },
    })
}
