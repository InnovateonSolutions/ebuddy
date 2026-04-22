import { describe, expect, it } from 'vitest'
import { getAuthenticatedUserId, requireAuthenticatedUserId } from './request'

describe('auth request helpers', () => {
  it('extrae el userId desde el header inyectado por middleware', () => {
    const request = new Request('http://localhost/api/test', {
      headers: { 'x-user-id': 'user-123' },
    })

    expect(getAuthenticatedUserId(request)).toBe('user-123')
  })

  it('devuelve response 401 cuando falta userId', async () => {
    const request = new Request('http://localhost/api/test')
    const result = requireAuthenticatedUserId(request)

    expect('response' in result).toBe(true)
    if ('response' in result) {
      const response = result.response as Response
      expect(response.status).toBe(401)
      await expect(response.json()).resolves.toMatchObject({
        code: 'UNAUTHORIZED',
      })
    }
  })
})
