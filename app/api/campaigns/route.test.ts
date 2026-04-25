import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireCapability: vi.fn(),
  importCampaignVault: vi.fn(),
  listCampaigns: vi.fn(),
}))

vi.mock('@/lib/auth/permissions', () => ({ requireCapability: mocks.requireCapability }))
vi.mock('@/features/campaigns/server/service', () => ({
  importCampaignVault: mocks.importCampaignVault,
  listCampaigns: mocks.listCampaigns,
}))

describe('/api/campaigns', () => {
  beforeEach(() => {
    vi.resetModules()
    mocks.requireCapability.mockReset()
    mocks.importCampaignVault.mockReset()
    mocks.listCampaigns.mockReset()
  })

  it('protege la importacion con gateway.execute', async () => {
    mocks.requireCapability.mockResolvedValue({ response: new Response('', { status: 403 }) })
    const { POST } = await import('./route')

    const res = await POST(new Request('http://localhost/api/campaigns', { method: 'POST', body: '{}' })) as Response

    expect(res.status).toBe(403)
  })

  it('importa una campaña para el usuario autenticado', async () => {
    mocks.requireCapability.mockResolvedValue({ userId: 'u1', role: 'OWNER', capabilities: ['gateway.execute'] })
    mocks.importCampaignVault.mockResolvedValue({ campaign: { id: 'c1', name: 'Ravenloft' }, importedNotes: 1 })
    const { POST } = await import('./route')

    const res = await POST(new Request('http://localhost/api/campaigns', {
      method: 'POST',
      body: JSON.stringify({ name: 'Ravenloft', notes: [{ relativePath: 'Hilda.md', content: '# Hilda' }] }),
    })) as Response
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.data.importedNotes).toBe(1)
    expect(mocks.importCampaignVault).toHaveBeenCalledWith('u1', {
      name: 'Ravenloft',
      notes: [{ relativePath: 'Hilda.md', content: '# Hilda' }],
    })
  })
})
