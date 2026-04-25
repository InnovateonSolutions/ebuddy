import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  insert: vi.fn(),
  delete: vi.fn(),
  select: vi.fn(),
  valuesCampaign: vi.fn(),
  returningCampaign: vi.fn(),
  valuesNotes: vi.fn(),
  deleteWhere: vi.fn(),
  selectFrom: vi.fn(),
  selectWhere: vi.fn(),
  orderBy: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  db: {
    insert: mocks.insert,
    delete: mocks.delete,
    select: mocks.select,
  },
}))

vi.mock('@/lib/db/schema', () => ({
  campaigns: {
    id: 'id',
    userId: 'userId',
    updatedAt: 'updatedAt',
  },
  campaignNotes: {
    campaignId: 'campaignId',
  },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((a: unknown, b: unknown) => ({ eq: [a, b] })),
  and: vi.fn((...args: unknown[]) => ({ and: args })),
  desc: vi.fn((value: unknown) => ({ desc: value })),
}))

describe('campaign service', () => {
  beforeEach(() => {
    vi.resetModules()
    Object.values(mocks).forEach((mock) => mock.mockReset())
    mocks.insert.mockReturnValueOnce({ values: mocks.valuesCampaign })
    mocks.valuesCampaign.mockReturnValue({ returning: mocks.returningCampaign })
    mocks.returningCampaign.mockResolvedValue([{ id: 'c1', name: 'Ravenloft', userId: 'u1', createdAt: new Date(), updatedAt: new Date() }])
    mocks.insert.mockReturnValueOnce({ values: mocks.valuesNotes })
    mocks.valuesNotes.mockResolvedValue(undefined)
  })

  it('crea una campaña y guarda sus notas normalizadas', async () => {
    const { importCampaignVault } = await import('./service')
    const result = await importCampaignVault('u1', {
      name: 'Ravenloft',
      notes: [{ relativePath: '03_NPC/Hilda.md', content: '# Hilda\n#npc' }],
    })

    expect(result.campaign.id).toBe('c1')
    expect(result.importedNotes).toBe(1)
    expect(mocks.valuesCampaign).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'u1',
      name: 'Ravenloft',
    }))
    expect(mocks.valuesNotes).toHaveBeenCalledWith([
      expect.objectContaining({
        campaignId: 'c1',
        relativePath: '03_NPC/Hilda.md',
        title: 'Hilda',
      }),
    ])
  })
})
