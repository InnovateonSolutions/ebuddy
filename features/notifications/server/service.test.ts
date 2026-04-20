import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  dbSelect: vi.fn(),
  sendEmail: vi.fn(),
  logEvent: vi.fn(),
  todayInTimezone: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  db: { select: mocks.dbSelect },
}))

vi.mock('@/lib/db/schema', () => ({
  tickets: {},
  users: {},
  userPreferences: {},
}))

vi.mock('@/features/notifications/server/due-tickets-email', () => ({
  sendDueTicketsEmail: mocks.sendEmail,
}))

vi.mock('@/lib/utils', () => ({
  logEvent: mocks.logEvent,
  todayInTimezone: mocks.todayInTimezone,
}))

import { runDueNotificationsCron } from './service'

const BASE_TICKET = {
  id: 't1',
  userId: 'u1',
  title: 'tarea',
  context: 'NEGOCIO',
  overview: '',
  whatToDo: '',
  nextSteps: [],
  priority: 'MEDIA',
  status: 'PENDING',
  rawInput: '',
  archived: false,
  createdAt: new Date(),
  updatedAt: new Date(),
}

function mockDbRows(rows: unknown[]) {
  mocks.dbSelect.mockReturnValue({
    from: () => ({
      innerJoin: () => ({
        leftJoin: () => ({
          where: () => Promise.resolve(rows),
        }),
      }),
    }),
  })
}

describe('runDueNotificationsCron', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.sendEmail.mockResolvedValue(undefined)
  })

  it('envía email solo a usuarios con tickets due hoy en su timezone', async () => {
    mocks.todayInTimezone.mockImplementation((tz: string) =>
      tz === 'America/Tijuana' ? '2026-04-19' : '2026-04-20'
    )

    mockDbRows([
      { ticket: { ...BASE_TICKET, dueDate: '2026-04-19' }, userEmail: 'a@test.com', timezone: 'America/Tijuana' },
      { ticket: { ...BASE_TICKET, id: 't2', dueDate: '2026-04-20' }, userEmail: 'b@test.com', timezone: 'Asia/Tokyo' },
      { ticket: { ...BASE_TICKET, id: 't3', dueDate: '2026-04-18' }, userEmail: 'a@test.com', timezone: 'America/Tijuana' },
    ])

    const result = await runDueNotificationsCron()

    expect(mocks.sendEmail).toHaveBeenCalledTimes(2)
    expect(result.sent).toBe(2)
    expect(result.users).toBe(2)
  })

  it('agrupa múltiples tickets del mismo usuario en un solo email', async () => {
    mocks.todayInTimezone.mockReturnValue('2026-04-19')

    mockDbRows([
      { ticket: { ...BASE_TICKET, id: 't1', dueDate: '2026-04-19' }, userEmail: 'a@test.com', timezone: 'America/Tijuana' },
      { ticket: { ...BASE_TICKET, id: 't2', dueDate: '2026-04-19' }, userEmail: 'a@test.com', timezone: 'America/Tijuana' },
    ])

    const result = await runDueNotificationsCron()

    expect(mocks.sendEmail).toHaveBeenCalledTimes(1)
    expect(mocks.sendEmail.mock.calls[0][1]).toHaveLength(2)
    expect(result.sent).toBe(1)
    expect(result.users).toBe(1)
  })

  it('usa America/Tijuana como fallback cuando timezone es null', async () => {
    mocks.todayInTimezone.mockReturnValue('2026-04-19')

    mockDbRows([
      { ticket: { ...BASE_TICKET, dueDate: '2026-04-19' }, userEmail: 'a@test.com', timezone: null },
    ])

    await runDueNotificationsCron()

    expect(mocks.todayInTimezone).toHaveBeenCalledWith('America/Tijuana')
    expect(mocks.sendEmail).toHaveBeenCalledTimes(1)
  })

  it('loguea errores de email sin detener el loop', async () => {
    mocks.todayInTimezone.mockReturnValue('2026-04-19')

    mockDbRows([
      { ticket: { ...BASE_TICKET, id: 't1', dueDate: '2026-04-19' }, userEmail: 'a@test.com', timezone: 'America/Tijuana' },
      { ticket: { ...BASE_TICKET, id: 't2', userId: 'u2', dueDate: '2026-04-19' }, userEmail: 'b@test.com', timezone: 'America/Tijuana' },
    ])

    mocks.sendEmail
      .mockRejectedValueOnce(new Error('SMTP error'))
      .mockResolvedValueOnce(undefined)

    const result = await runDueNotificationsCron()

    expect(mocks.logEvent).toHaveBeenCalledWith('email.error', expect.objectContaining({
      error: 'SMTP error',
    }))
    expect(result.sent).toBe(1)
    expect(result.users).toBe(2)
  })

  it('retorna 0 cuando no hay tickets vencidos hoy', async () => {
    mocks.todayInTimezone.mockReturnValue('2026-04-19')
    mockDbRows([])

    const result = await runDueNotificationsCron()

    expect(mocks.sendEmail).not.toHaveBeenCalled()
    expect(result).toEqual({ sent: 0, users: 0 })
  })
})
