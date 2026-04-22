import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  dbInsert: vi.fn(),
  dbSelect: vi.fn(),
  randomBytes: vi.fn(),
  hashApiKey: vi.fn((k: string) => `hash:${k}`),
  buildApiKeyPreview: vi.fn((k: string) => `${k.slice(0, 8)}••••`),
  logEvent: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  db: {
    insert: () => ({ values: () => ({ onConflictDoUpdate: mocks.dbInsert }) }),
    select: mocks.dbSelect,
  },
}))
vi.mock('@/lib/db/schema', () => ({ userPreferences: {} }))
vi.mock('@/lib/secrets', () => ({
  hashApiKey: mocks.hashApiKey,
  buildApiKeyPreview: mocks.buildApiKeyPreview,
}))
vi.mock('@/lib/utils', () => ({ logEvent: mocks.logEvent }))
vi.mock('crypto', async (importOriginal) => {
  const actual = await importOriginal<typeof import('crypto')>()
  return { ...actual, randomBytes: mocks.randomBytes }
})

import {
  validatePreferences,
  updateUserPreferences,
  getApiKeyMeta,
  generateApiKey,
  VALID_TIMEZONES,
} from './service'

describe('validatePreferences', () => {
  it('acepta input vacío', () => {
    expect(validatePreferences({})).toBeNull()
  })

  it('acepta una timezone válida', () => {
    expect(validatePreferences({ timezone: 'America/Tijuana' })).toBeNull()
  })

  it('rechaza timezone inválida', () => {
    const error = validatePreferences({ timezone: 'Mars/Olympus' })
    expect(error?.field).toBe('timezone')
  })

  it('acepta workStart en formato HH:MM', () => {
    expect(validatePreferences({ workStart: '08:00' })).toBeNull()
    expect(validatePreferences({ workStart: '23:59' })).toBeNull()
  })

  it('rechaza workStart con formato inválido', () => {
    expect(validatePreferences({ workStart: '8:00' })?.field).toBe('workStart')
    expect(validatePreferences({ workStart: '24:00' })?.field).toBe('workStart')
  })

  it('rechaza aiProvider inválido', () => {
    expect(validatePreferences({ aiProvider: 'gpt4' })?.field).toBe('aiProvider')
  })

  it('rechaza un rango de trabajo invertido', () => {
    const error = validatePreferences({ workStart: '19:00', workEnd: '08:00' })
    expect(error?.field).toBe('workEnd')
  })

  it('rechaza ollamaModel vacío cuando se envía explícitamente', () => {
    const error = validatePreferences({ ollamaModel: '   ' })
    expect(error?.field).toBe('ollamaModel')
  })

  it('acepta aiProvider válido', () => {
    expect(validatePreferences({ aiProvider: 'claude' })).toBeNull()
    expect(validatePreferences({ aiProvider: 'ollama' })).toBeNull()
    expect(validatePreferences({ aiProvider: 'auto' })).toBeNull()
  })

  it('VALID_TIMEZONES incluye las zonas requeridas', () => {
    expect(VALID_TIMEZONES).toContain('America/Tijuana')
    expect(VALID_TIMEZONES).toContain('America/New_York')
    expect(VALID_TIMEZONES).toContain('UTC')
  })
})

describe('updateUserPreferences', () => {
  beforeEach(() => vi.clearAllMocks())

  it('hace upsert con los campos provistos', async () => {
    mocks.dbSelect.mockReturnValue({
      from: () => ({ where: () => Promise.resolve([{ workStart: '08:00', workEnd: '19:00', aiProvider: 'claude', ollamaModel: 'llama3:latest', timezone: 'America/Tijuana' }]) }),
    })
    mocks.dbInsert.mockResolvedValue(undefined)

    const updated = await updateUserPreferences('u1', {
      timezone: 'America/New_York',
      aiProvider: 'ollama',
    })

    expect(mocks.dbInsert).toHaveBeenCalledOnce()
    expect(updated).toEqual(['timezone', 'aiProvider'])
  })

  it('ignora campos falsy (no los incluye en el update)', async () => {
    mocks.dbSelect.mockReturnValue({
      from: () => ({ where: () => Promise.resolve([{ workStart: '08:00', workEnd: '19:00', aiProvider: 'claude', ollamaModel: 'llama3:latest', timezone: 'America/Tijuana' }]) }),
    })
    mocks.dbInsert.mockResolvedValue(undefined)

    const updated = await updateUserPreferences('u1', { timezone: '', workStart: '09:00' })

    expect(updated).not.toContain('timezone')
    expect(updated).toContain('workStart')
  })

  it('rechaza una actualización que deja workStart después de workEnd vigente', async () => {
    mocks.dbSelect.mockReturnValue({
      from: () => ({ where: () => Promise.resolve([{ workStart: '08:00', workEnd: '19:00', aiProvider: 'claude', ollamaModel: 'llama3:latest', timezone: 'America/Tijuana' }]) }),
    })

    await expect(updateUserPreferences('u1', { workStart: '20:00' })).rejects.toMatchObject({
      field: 'workEnd',
    })
  })
})

describe('getApiKeyMeta', () => {
  beforeEach(() => vi.clearAllMocks())

  it('devuelve hasKey true cuando existe un hash', async () => {
    mocks.dbSelect.mockReturnValue({
      from: () => ({ where: () => Promise.resolve([{ apiKeyHash: 'abc', apiKeyPreview: 'abc•••' }]) }),
    })

    const meta = await getApiKeyMeta('u1')

    expect(meta.hasKey).toBe(true)
    expect(meta.preview).toBe('abc•••')
  })

  it('devuelve hasKey false cuando no hay preferencias', async () => {
    mocks.dbSelect.mockReturnValue({
      from: () => ({ where: () => Promise.resolve([]) }),
    })

    const meta = await getApiKeyMeta('u1')

    expect(meta.hasKey).toBe(false)
    expect(meta.preview).toBeNull()
  })
})

describe('generateApiKey', () => {
  beforeEach(() => vi.clearAllMocks())

  it('genera key, hash y preview, y los persiste', async () => {
    mocks.randomBytes.mockReturnValue(Buffer.from('a'.repeat(32)))
    mocks.dbInsert.mockResolvedValue(undefined)

    const result = await generateApiKey('u1')

    expect(mocks.hashApiKey).toHaveBeenCalledOnce()
    expect(mocks.buildApiKeyPreview).toHaveBeenCalledOnce()
    expect(mocks.dbInsert).toHaveBeenCalledOnce()
    expect(result.key).toBeDefined()
    expect(result.preview).toBeDefined()
  })

  it('loguea el evento api_key.generated', async () => {
    mocks.randomBytes.mockReturnValue(Buffer.from('a'.repeat(32)))
    mocks.dbInsert.mockResolvedValue(undefined)

    await generateApiKey('u1')

    expect(mocks.logEvent).toHaveBeenCalledWith('api_key.generated', { userId: 'u1' })
  })
})
