import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  todayInTimezone: vi.fn(() => '2026-04-19'),
}))

vi.mock('@/lib/utils', () => ({ todayInTimezone: mocks.todayInTimezone }))
vi.mock('@/lib/db/schema', () => ({ tickets: {}, userPreferences: {} }))

// Chain que es thenable Y tiene orderBy/limit encadenables
function makeChain(result: unknown[]) {
  const node: Record<string, unknown> = {}
  const promise = Promise.resolve(result)
  node.then = promise.then.bind(promise)
  node.catch = promise.catch.bind(promise)
  node.orderBy = () => node
  node.limit = () => promise
  node.where = () => node
  node.from = () => node
  return node
}

const queryQueue: unknown[][] = []

vi.mock('@/lib/db', () => ({
  db: {
    select: () => ({ from: () => ({ where: () => makeChain(queryQueue.shift() ?? []) }) }),
  },
}))

import { getUserTimezone, getTodayViewData } from './queries'

const BASE_TICKET = {
  id: 't1', userId: 'u1', title: 'tarea',
  context: 'NEGOCIO' as const, overview: '', whatToDo: '',
  nextSteps: [], priority: 'MEDIA' as const, status: 'PENDING' as const,
  dueDate: '2026-04-19', rawInput: '', archived: false,
  createdAt: new Date(), updatedAt: new Date(),
}

describe('getUserTimezone', () => {
  beforeEach(() => { queryQueue.length = 0; vi.clearAllMocks() })

  it('devuelve la timezone del usuario', async () => {
    queryQueue.push([{ timezone: 'America/New_York' }])
    expect(await getUserTimezone('u1')).toBe('America/New_York')
  })

  it('devuelve America/Tijuana como fallback si no hay preferencias', async () => {
    queryQueue.push([])
    expect(await getUserTimezone('u1')).toBe('America/Tijuana')
  })
})

describe('getTodayViewData', () => {
  beforeEach(() => { queryQueue.length = 0; vi.clearAllMocks() })

  it('usa la timezone del usuario para calcular hoy', async () => {
    mocks.todayInTimezone.mockReturnValue('2026-04-20')
    queryQueue.push([{ timezone: 'America/New_York' }])
    queryQueue.push([])

    const result = await getTodayViewData('u1')

    expect(mocks.todayInTimezone).toHaveBeenCalledWith('America/New_York')
    expect(result.data.date).toBe('2026-04-20')
  })

  it('separa tickets por contexto NEGOCIO y PERSONAL', async () => {
    queryQueue.push([{ timezone: 'America/Tijuana' }])
    queryQueue.push([
      { ...BASE_TICKET, id: 't1', context: 'NEGOCIO' as const },
      { ...BASE_TICKET, id: 't2', context: 'PERSONAL' as const },
    ])

    const result = await getTodayViewData('u1')

    expect(result.data.tickets.negocio).toHaveLength(1)
    expect(result.data.tickets.personal).toHaveLength(1)
  })

  it('devuelve listas vacías cuando no hay tickets hoy', async () => {
    queryQueue.push([{ timezone: 'America/Tijuana' }])
    queryQueue.push([])

    const result = await getTodayViewData('u1')

    expect(result.data.tickets.negocio).toHaveLength(0)
    expect(result.data.tickets.personal).toHaveLength(0)
  })
})
