import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  insertValues: vi.fn(),
  classifyAndStructure: vi.fn(),
  logEvent: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  db: {
    insert: () => ({ values: mocks.insertValues }),
    select: () => ({
      from: () => ({
        where: () => ({
          then: (fn: (rows: unknown[]) => unknown) => Promise.resolve(fn([])),
        }),
      }),
    }),
  },
}))

vi.mock('@/lib/db/schema', () => ({
  tickets: {},
  userPreferences: {},
}))

vi.mock('@/lib/ai/provider', () => ({
  getAIService: vi.fn(() => ({
    classifyAndStructure: mocks.classifyAndStructure,
  })),
}))

vi.mock('@/lib/ai/claude', () => ({
  ClaudeAIService: vi.fn(() => ({
    classifyAndStructure: mocks.classifyAndStructure,
  })),
}))

vi.mock('@/lib/ai/whisper', () => ({
  WhisperTranscriptionService: vi.fn(),
}))

vi.mock('@/lib/utils', () => ({
  logEvent: mocks.logEvent,
}))

import { createTicketFromCapturedInput } from './capture'

describe('createTicketFromCapturedInput', () => {
  beforeEach(() => {
    mocks.insertValues.mockReset()
    mocks.classifyAndStructure.mockReset()
    mocks.logEvent.mockReset()

    mocks.insertValues.mockReturnValue({
      returning: async () => [
        {
          id: 'ticket-1',
          userId: 'user-1',
          title: 'prueba',
          context: 'NEGOCIO',
          overview: '',
          whatToDo: 'prueba',
          nextSteps: [],
          priority: 'MEDIA',
          status: 'PENDING',
          dueDate: null,
          rawInput: 'crear ticket prueba en negocio',
        },
      ],
    })
  })

  it('crea fallback determinista cuando la IA falla con instrucción textual simple', async () => {
    mocks.classifyAndStructure.mockRejectedValueOnce(
      new Error('Claude devolvió JSON inválido')
    )

    await createTicketFromCapturedInput(
      'user-1',
      'crear ticket prueba en negocio',
      undefined,
      Date.now()
    )

    expect(mocks.insertValues).toHaveBeenCalledOnce()
    expect(mocks.insertValues.mock.calls[0][0]).toMatchObject({
      userId: 'user-1',
      title: 'prueba',
      context: 'NEGOCIO',
      priority: 'MEDIA',
      status: 'PENDING',
      dueDate: null,
      rawInput: 'crear ticket prueba en negocio',
    })
  })

  it('prioriza contexto personal cuando el texto lo indica', async () => {
    mocks.classifyAndStructure.mockRejectedValueOnce(
      new Error('Claude devolvió JSON inválido')
    )

    await createTicketFromCapturedInput(
      'user-1',
      'crear ticket comprar regalo en personal',
      undefined,
      Date.now()
    )

    expect(mocks.insertValues.mock.calls[0][0]).toMatchObject({
      title: 'comprar regalo',
      context: 'PERSONAL',
    })
  })
})
