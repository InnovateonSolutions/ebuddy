import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  dbResult: vi.fn(),
  todayInTimezone: vi.fn(() => '2026-04-19'),
}))

vi.mock('@/lib/utils', () => ({ todayInTimezone: mocks.todayInTimezone }))

vi.mock('@/lib/db/schema', () => ({
  tickets: {},
  userPreferences: {},
}))

const mockChain = (result: unknown) => ({
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  limit: vi.fn().mockResolvedValue(result),
  then: undefined,
})

vi.mock('@/lib/db', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: mocks.dbResult,
          orderBy: vi.fn(() => ({
            limit: mocks.dbResult,
          })),
        })),
      })),
    })),
  },
}))

import { getUserTimezone, getTodayViewData } from './queries'

const BASE_TICKET = {
  id: 't1',
  userId: 'u1',
  title: 'tarea',
  context: 'NEGOCIO' as const,
  overview: '',
  whatToDo: '',
  nextSteps: [],
  priority: 'MEDIA' as const,
  status: 'PENDING' as const,
  dueDate: '2026-04-19',
  rawInput: '',
  archived: false,
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('getUserTimezone', () => {
  beforeEach(() => vi.clearAllMocks())

  it('devuelve la timezone del usuario', async () => {
    mocks.dbResult.mockResolvedValue([{ timezone: 'America/New_York' }])

    const tz = await getUserTimezone('u1')

    expect(tz).toBe('America/New_York')
  })

  it('devuelve America/Tijuana como fallback si no hay preferencias', async () => {
    mocks.dbResult.mockResolvedValue([])

    const tz = await getUserTimezone('u1')

    expect(tz).toBe('America/Tijuana')
  })
})

describe('getTodayViewData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.todayInTimezone.mockReturnValue('2026-04-19')
  })

  it('devuelve la fecha correcta según la timezone del usuario', async () => {
    mocks.dbResult
      .mockResolvedValueOnce([{ timezone: 'America/New_York' }])
      .mockResolvedValue([])

    mocks.todayInTimezone.mockReturnValue('2026-04-20')

    const result = await getTodayViewData('u1')

    expect(mocks.todayInTimezone).toHaveBeenCalledWith('America/New_York')
    expect(result.data.date).toBe('2026-04-20')
  })

  it('separa tickets por contexto NEGOCIO y PERSONAL', async () => {
    const negocioTicket = { ...BASE_TICKET, id: 't1', context: 'NEGOCIO' as const }
    const personalTicket = { ...BASE_TICKET, id: 't2', context: 'PERSONAL' as const }

    mocks.dbResult
      .mockResolvedValueOnce([{ timezone: 'America/Tijuana' }])
      .mockResolvedValue([negocioTicket, personalTicket])

    const result = await getTodayViewData('u1')

    expect(result.data.tickets.negocio).toHaveLength(1)
    expect(result.data.tickets.personal).toHaveLength(1)
    expect(result.data.tickets.negocio[0].id).toBe('t1')
    expect(result.data.tickets.personal[0].id).toBe('t2')
  })

  it('devuelve listas vacías cuando no hay tickets hoy', async () => {
    mocks.dbResult
      .mockResolvedValueOnce([{ timezone: 'America/Tijuana' }])
      .mockResolvedValue([])

    const result = await getTodayViewData('u1')

    expect(result.data.tickets.negocio).toHaveLength(0)
    expect(result.data.tickets.personal).toHaveLength(0)
  })
})
