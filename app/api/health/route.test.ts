import { describe, it, expect, vi, beforeEach } from 'vitest'

const mocks = vi.hoisted(() => ({ dbExecute: vi.fn() }))
vi.mock('@/lib/db', () => ({ db: { execute: mocks.dbExecute } }))
vi.mock('drizzle-orm', () => ({ sql: vi.fn((s: TemplateStringsArray) => s[0]) }))

describe('GET /api/health', () => {
  beforeEach(() => { vi.resetModules(); mocks.dbExecute.mockReset() })

  it('retorna status ok cuando DB responde', async () => {
    mocks.dbExecute.mockResolvedValue([])
    const { GET } = await import('./route')
    const res = await GET() as Response
    const body = await res.json()
    expect(body.status).toBe('ok')
    expect(body.db).toBe('ok')
  })

  it('retorna status degraded cuando DB falla', async () => {
    mocks.dbExecute.mockRejectedValue(new Error('connection refused'))
    const { GET } = await import('./route')
    const res = await GET() as Response
    const body = await res.json()
    expect(body.status).toBe('degraded')
    expect(body.db).toBe('error')
  })
})
