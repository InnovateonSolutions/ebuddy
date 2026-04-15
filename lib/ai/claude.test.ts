import { describe, it, expect, vi, beforeEach } from 'vitest'

// vi.hoisted permite referenciar mocks dentro de las factories de vi.mock
// (las factories se ejecutan antes que cualquier import)
const mocks = vi.hoisted(() => ({
  messagesCreate: vi.fn(),
}))

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn(() => ({
    messages: { create: mocks.messagesCreate },
  })),
}))

vi.mock('@/lib/env', () => ({
  env: { anthropicApiKey: 'sk-ant-test-key' },
}))

import { ClaudeAIService } from './claude'

// ─── fixtures ────────────────────────────────────────────────────────────────

const VALID_RESPONSE = {
  context: 'NEGOCIO',
  title: 'Revisar propuesta cliente García',
  overview: 'Propuesta para cliente García con deadline esta semana. Requiere revisión de precios.',
  what_to_do: 'Abrir el documento en Drive y actualizar la sección de precios',
  next_steps: [
    'Abrir propuesta en Google Drive',
    'Ajustar sección de precios según feedback',
    'Enviar al cliente antes del jueves 18:00',
  ],
  priority: 'ALTA',
}

function makeMessage(text: string) {
  return { content: [{ type: 'text', text }] }
}

// ─── tests ────────────────────────────────────────────────────────────────────

describe('ClaudeAIService', () => {
  let service: ClaudeAIService

  beforeEach(() => {
    service = new ClaudeAIService()
  })

  it('retorna StructuredTicket válido con respuesta JSON correcta', async () => {
    mocks.messagesCreate.mockResolvedValueOnce(
      makeMessage(JSON.stringify(VALID_RESPONSE))
    )

    const result = await service.classifyAndStructure(
      'Necesito revisar la propuesta para el cliente García esta semana'
    )

    expect(result.context).toBe('NEGOCIO')
    expect(result.title).toBe('Revisar propuesta cliente García')
    expect(result.priority).toBe('ALTA')
    expect(result.next_steps).toHaveLength(3)
    expect(result.what_to_do).toContain('Drive')
  })

  it('lanza error cuando Claude devuelve JSON malformado', async () => {
    mocks.messagesCreate.mockResolvedValueOnce(
      makeMessage('esto no es JSON válido {{{')
    )

    await expect(
      service.classifyAndStructure('texto de prueba')
    ).rejects.toThrow('JSON inválido')
  })

  it('lanza error cuando el JSON no cumple el schema Zod', async () => {
    mocks.messagesCreate.mockResolvedValueOnce(
      makeMessage(JSON.stringify({ context: 'INVALIDO', title: 'algo' }))
    )

    await expect(
      service.classifyAndStructure('texto de prueba')
    ).rejects.toThrow('schema')
  })

  it('lanza error cuando el tipo de contenido no es texto', async () => {
    mocks.messagesCreate.mockResolvedValueOnce({
      content: [{ type: 'tool_use', id: 'abc', name: 'tool', input: {} }],
    })

    await expect(
      service.classifyAndStructure('texto de prueba')
    ).rejects.toThrow('tipo de contenido inesperado')
  })

  it('lanza AI_TIMEOUT cuando AbortController dispara tras 30 segundos', async () => {
    vi.useFakeTimers()

    mocks.messagesCreate.mockImplementationOnce(
      (_params: unknown, options?: { signal?: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          options?.signal?.addEventListener('abort', () => {
            const err = new Error('The operation was aborted.')
            err.name = 'AbortError'
            reject(err)
          })
        })
    )

    const promise = service.classifyAndStructure('texto que causará timeout')
    // Registrar el handler ANTES de avanzar el tiempo — evita unhandled rejection warning
    const assertion = expect(promise).rejects.toThrow('AI_TIMEOUT')
    await vi.advanceTimersByTimeAsync(31_000)
    await assertion

    vi.useRealTimers()
  })

  it('trunca el input del usuario a 2000 caracteres antes de enviarlo a Claude', async () => {
    mocks.messagesCreate.mockResolvedValueOnce(
      makeMessage(JSON.stringify(VALID_RESPONSE))
    )

    const longText = 'a'.repeat(5000)
    await service.classifyAndStructure(longText)

    const callArgs = mocks.messagesCreate.mock.calls[0][0]
    const userContent = callArgs.messages[0].content as string
    // 2000 chars de texto + etiquetas <user_input> (~24 chars)
    expect(userContent.length).toBeLessThanOrEqual(2030)
  })

  it('incluye delimitadores <user_input> en el mensaje enviado a Claude', async () => {
    mocks.messagesCreate.mockResolvedValueOnce(
      makeMessage(JSON.stringify(VALID_RESPONSE))
    )

    await service.classifyAndStructure('mi instrucción')

    const callArgs = mocks.messagesCreate.mock.calls[0][0]
    const userContent = callArgs.messages[0].content as string
    expect(userContent).toContain('<user_input>')
    expect(userContent).toContain('</user_input>')
    expect(userContent).toContain('mi instrucción')
  })

  it('pasa AbortSignal al SDK de Anthropic', async () => {
    mocks.messagesCreate.mockResolvedValueOnce(
      makeMessage(JSON.stringify(VALID_RESPONSE))
    )

    await service.classifyAndStructure('texto')

    const callOptions = mocks.messagesCreate.mock.calls[0][1]
    expect(callOptions).toHaveProperty('signal')
    expect(callOptions.signal).toBeInstanceOf(AbortSignal)
  })
})
