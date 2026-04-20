import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  exchangeGoogle: vi.fn(),
  exchangeMicrosoft: vi.fn(),
  dbInsert: vi.fn(),
  encryptSecret: vi.fn((v: string) => `enc:${v}`),
  logEvent: vi.fn(),
}))

vi.mock('@/features/calendar/server/google', () => ({
  exchangeCodeForTokens: mocks.exchangeGoogle,
}))

vi.mock('@/features/calendar/server/microsoft', () => ({
  exchangeCodeForTokens: mocks.exchangeMicrosoft,
}))

vi.mock('@/lib/db', () => ({
  db: {
    insert: () => ({ values: () => ({ onConflictDoUpdate: mocks.dbInsert }) }),
  },
}))

vi.mock('@/lib/db/schema', () => ({ calendarTokens: {} }))

vi.mock('@/lib/secrets', () => ({ encryptSecret: mocks.encryptSecret }))

vi.mock('@/lib/utils', () => ({ logEvent: mocks.logEvent }))

import { connectGoogleCalendar, connectMicrosoftCalendar } from './connect'

const TOKENS = {
  access_token: 'access123',
  refresh_token: 'refresh456',
  expires_at: '2026-05-01T00:00:00.000Z',
}

describe('connectGoogleCalendar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.exchangeGoogle.mockResolvedValue(TOKENS)
    mocks.dbInsert.mockResolvedValue(undefined)
  })

  it('encripta tokens y hace upsert en DB', async () => {
    await connectGoogleCalendar('user-1', 'code-abc')

    expect(mocks.exchangeGoogle).toHaveBeenCalledWith('code-abc')
    expect(mocks.encryptSecret).toHaveBeenCalledWith('access123')
    expect(mocks.encryptSecret).toHaveBeenCalledWith('refresh456')
    expect(mocks.dbInsert).toHaveBeenCalledOnce()
  })

  it('loguea el evento calendar.connected', async () => {
    await connectGoogleCalendar('user-1', 'code-abc')

    expect(mocks.logEvent).toHaveBeenCalledWith('calendar.connected', {
      userId: 'user-1',
      provider: 'GOOGLE',
    })
  })

  it('lanza error si el exchange falla', async () => {
    mocks.exchangeGoogle.mockRejectedValue(new Error('invalid_code'))

    await expect(connectGoogleCalendar('user-1', 'bad-code')).rejects.toThrow('invalid_code')
    expect(mocks.dbInsert).not.toHaveBeenCalled()
    expect(mocks.logEvent).not.toHaveBeenCalled()
  })
})

describe('connectMicrosoftCalendar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.exchangeMicrosoft.mockResolvedValue(TOKENS)
    mocks.dbInsert.mockResolvedValue(undefined)
  })

  it('encripta tokens y hace upsert en DB', async () => {
    await connectMicrosoftCalendar('user-2', 'code-xyz')

    expect(mocks.exchangeMicrosoft).toHaveBeenCalledWith('code-xyz')
    expect(mocks.dbInsert).toHaveBeenCalledOnce()
  })

  it('loguea el evento calendar.connected con provider MICROSOFT', async () => {
    await connectMicrosoftCalendar('user-2', 'code-xyz')

    expect(mocks.logEvent).toHaveBeenCalledWith('calendar.connected', {
      userId: 'user-2',
      provider: 'MICROSOFT',
    })
  })

  it('lanza error si el exchange falla', async () => {
    mocks.exchangeMicrosoft.mockRejectedValue(new Error('expired_token'))

    await expect(connectMicrosoftCalendar('user-2', 'bad')).rejects.toThrow('expired_token')
    expect(mocks.logEvent).not.toHaveBeenCalled()
  })
})
