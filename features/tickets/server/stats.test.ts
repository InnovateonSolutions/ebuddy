import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  selectAll: vi.fn(),
  selectMonth: vi.fn(),
  todayInTimezone: vi.fn(() => '2026-04-19'),
}))

vi.mock('@/lib/db', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockImplementation(function (this: unknown) { return this }),
  },
}))

vi.mock('@/lib/utils', () => ({
  todayInTimezone: mocks.todayInTimezone,
}))

import { getTicketStats } from './stats'
import { db } from '@/lib/db'

const BASE_TICKET = {
  id: 't1',
  userId: 'u1',
  title: 'test',
  context: 'NEGOCIO' as const,
  overview: '',
  whatToDo: '',
  nextSteps: [],
  priority: 'MEDIA' as const,
  status: 'PENDING' as const,
  dueDate: null,
  rawInput: '',
  archived: false,
  createdAt: new Date('2026-04-01'),
  updatedAt: new Date('2026-04-01'),
}

function makeTicket(overrides: Partial<typeof BASE_TICKET>) {
  return { ...BASE_TICKET, ...overrides }
}

describe('getTicketStats', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.todayInTimezone.mockReturnValue('2026-04-19')
  })

  it('cuenta tickets por context, priority y status', async () => {
    const allTickets = [
      makeTicket({ id: '1', context: 'NEGOCIO', priority: 'ALTA', status: 'PENDING' }),
      makeTicket({ id: '2', context: 'PERSONAL', priority: 'BAJA', status: 'DONE', updatedAt: new Date('2026-04-18') }),
      makeTicket({ id: '3', context: 'NEGOCIO', priority: 'MEDIA', status: 'IN_PROGRESS' }),
    ]

    let callCount = 0
    vi.mocked(db.select).mockImplementation(() => ({
      from: () => ({
        where: () => callCount++ === 0 ? Promise.resolve(allTickets) : Promise.resolve([]),
      }),
    } as never))

    const stats = await getTicketStats('u1', 'America/Tijuana')

    expect(stats.total).toBe(3)
    expect(stats.byContext).toEqual({ NEGOCIO: 2, PERSONAL: 1 })
    expect(stats.byPriority).toEqual({ ALTA: 1, MEDIA: 1, BAJA: 1 })
    expect(stats.byStatus).toEqual({ PENDING: 1, IN_PROGRESS: 1, QA: 0, DONE: 1 })
  })

  it('calcula weekTrend correctamente', async () => {
    const now = new Date()
    const threeDaysAgo = new Date(now)
    threeDaysAgo.setDate(now.getDate() - 3)
    const tenDaysAgo = new Date(now)
    tenDaysAgo.setDate(now.getDate() - 10)

    const lastMonthTickets = [
      makeTicket({ id: '1', status: 'DONE', updatedAt: threeDaysAgo }),
      makeTicket({ id: '2', status: 'DONE', updatedAt: threeDaysAgo }),
      makeTicket({ id: '3', status: 'DONE', updatedAt: tenDaysAgo }),
    ]

    let callCount = 0
    vi.mocked(db.select).mockImplementation(() => ({
      from: () => ({
        where: () => callCount++ === 0 ? Promise.resolve([]) : Promise.resolve(lastMonthTickets),
      }),
    } as never))

    const stats = await getTicketStats('u1', 'America/Tijuana')

    expect(stats.doneThisWeek).toBe(2)
    expect(stats.doneLastWeek).toBe(1)
    expect(stats.weekTrend).toBe(100) // (2-1)/1 * 100
  })

  it('weekTrend es null cuando no hay tickets la semana anterior', async () => {
    const threeDaysAgo = new Date()
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)

    const lastMonthTickets = [
      makeTicket({ id: '1', status: 'DONE', updatedAt: threeDaysAgo }),
    ]

    let callCount = 0
    vi.mocked(db.select).mockImplementation(() => ({
      from: () => ({
        where: () => callCount++ === 0 ? Promise.resolve([]) : Promise.resolve(lastMonthTickets),
      }),
    } as never))

    const stats = await getTicketStats('u1', 'America/Tijuana')

    expect(stats.weekTrend).toBeNull()
  })

  it('calcula streak de días consecutivos con tickets DONE', async () => {
    mocks.todayInTimezone.mockReturnValue('2026-04-19')

    const doneDates = ['2026-04-19', '2026-04-18', '2026-04-17']
    const lastMonthTickets = doneDates.map((d, i) =>
      makeTicket({ id: String(i), status: 'DONE', updatedAt: new Date(`${d}T12:00:00Z`) })
    )

    let callCount = 0
    vi.mocked(db.select).mockImplementation(() => ({
      from: () => ({
        where: () => callCount++ === 0 ? Promise.resolve([]) : Promise.resolve(lastMonthTickets),
      }),
    } as never))

    const stats = await getTicketStats('u1', 'America/Tijuana')

    expect(stats.streak).toBe(3)
  })

  it('streak es 0 cuando hoy no tiene tickets DONE', async () => {
    mocks.todayInTimezone.mockReturnValue('2026-04-19')

    const lastMonthTickets = [
      makeTicket({ id: '1', status: 'DONE', updatedAt: new Date('2026-04-17T12:00:00Z') }),
    ]

    let callCount = 0
    vi.mocked(db.select).mockImplementation(() => ({
      from: () => ({
        where: () => callCount++ === 0 ? Promise.resolve([]) : Promise.resolve(lastMonthTickets),
      }),
    } as never))

    const stats = await getTicketStats('u1', 'America/Tijuana')

    expect(stats.streak).toBe(0)
  })
})
