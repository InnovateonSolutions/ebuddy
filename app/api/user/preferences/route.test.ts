import { describe, it, expect, vi, beforeEach } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireAuthenticatedUserId: vi.fn(),
  validatePreferences: vi.fn(),
  updateUserPreferences: vi.fn(),
  UserPreferencesValidationError: class extends Error {},
}))

vi.mock('@/lib/auth/request', () => ({ requireAuthenticatedUserId: mocks.requireAuthenticatedUserId }))
vi.mock('@/features/settings/server/service', () => ({
  validatePreferences: mocks.validatePreferences,
  updateUserPreferences: mocks.updateUserPreferences,
  UserPreferencesValidationError: mocks.UserPreferencesValidationError,
}))

describe('PUT /api/user/preferences', () => {
  beforeEach(() => {
    vi.resetModules()
    mocks.requireAuthenticatedUserId.mockReset()
    mocks.validatePreferences.mockReset()
    mocks.updateUserPreferences.mockReset()
  })

  it('retorna 401 sin autenticación', async () => {
    mocks.requireAuthenticatedUserId.mockReturnValue({ response: new Response('', { status: 401 }) })
    const { PUT } = await import('./route')
    const res = await PUT(new Request('http://localhost/api/user/preferences', { method: 'PUT', body: '{}' })) as Response
    expect(res.status).toBe(401)
  })

  it('retorna 400 con body inválido', async () => {
    mocks.requireAuthenticatedUserId.mockReturnValue({ userId: 'u1' })
    mocks.validatePreferences.mockReturnValue(new Error('Timezone inválida'))
    const { PUT } = await import('./route')
    const res = await PUT(new Request('http://localhost/api/user/preferences', {
      method: 'PUT',
      body: JSON.stringify({ timezone: 'INVALID' }),
    })) as Response
    expect(res.status).toBe(400)
  })

  it('actualiza preferencias correctamente', async () => {
    mocks.requireAuthenticatedUserId.mockReturnValue({ userId: 'u1' })
    mocks.validatePreferences.mockReturnValue(null)
    mocks.updateUserPreferences.mockResolvedValue(true)
    const { PUT } = await import('./route')
    const res = await PUT(new Request('http://localhost/api/user/preferences', {
      method: 'PUT',
      body: JSON.stringify({ timezone: 'America/Tijuana' }),
    })) as Response
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.updated).toBe(true)
  })
})
