import { desc, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { campaignNotes, campaigns } from '@/lib/db/schema'
import { parseCampaignImport, type CampaignImportInput } from './contracts'

export class CampaignImportError extends Error {}

export async function importCampaignVault(userId: string, input: CampaignImportInput) {
  const parsed = parseCampaignImport(input)
  if (!parsed.success) throw new CampaignImportError(parsed.message)

  const [campaign] = await db
    .insert(campaigns)
    .values({
      userId,
      name: parsed.data.name,
    })
    .returning()

  await db.insert(campaignNotes).values(parsed.data.notes.map((note) => ({
    campaignId: campaign.id,
    relativePath: note.relativePath,
    folder: note.folder,
    title: note.title,
    content: note.content,
    links: note.links,
    tags: note.tags,
  })))

  return { campaign, importedNotes: parsed.data.notes.length }
}

export async function listCampaigns(userId: string) {
  return db
    .select({
      id: campaigns.id,
      name: campaigns.name,
      createdAt: campaigns.createdAt,
      updatedAt: campaigns.updatedAt,
    })
    .from(campaigns)
    .where(eq(campaigns.userId, userId))
    .orderBy(desc(campaigns.updatedAt))
}

export async function getLatestCampaignNotes(userId: string, limit = 200) {
  const rows = await db
    .select({
      id: campaigns.id,
      name: campaigns.name,
    })
    .from(campaigns)
    .where(eq(campaigns.userId, userId))
    .orderBy(desc(campaigns.updatedAt))
    .limit(1)

  const campaign = rows[0]
  if (!campaign) return null

  const notes = await db
    .select({
      title: campaignNotes.title,
      relativePath: campaignNotes.relativePath,
      folder: campaignNotes.folder,
      content: campaignNotes.content,
      links: campaignNotes.links,
      tags: campaignNotes.tags,
    })
    .from(campaignNotes)
    .where(eq(campaignNotes.campaignId, campaign.id))
    .limit(limit)

  return { campaign, notes }
}
