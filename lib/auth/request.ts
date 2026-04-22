import { apiError } from '@/lib/utils'

export const AUTH_USER_ID_HEADER = 'x-user-id'

export function getAuthenticatedUserId(request: Request): string | null {
  return request.headers.get(AUTH_USER_ID_HEADER)
}

export function requireAuthenticatedUserId(request: Request) {
  const userId = getAuthenticatedUserId(request)
  if (!userId) {
    return { response: apiError('No autorizado', 'UNAUTHORIZED', 401) } as const
  }

  return { userId } as const
}
