import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { ApiError, ApiErrorCode, ApiResponse } from '@/lib/types'

// Combina clases Tailwind sin conflictos
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Respuestas de API estandarizadas
export function apiSuccess<T>(data: T): Response {
  return Response.json({ success: true, data }, { status: 200 })
}

export function apiError(
  error: string,
  code: ApiErrorCode,
  status = 400
): Response {
  const body: ApiError = { success: false, error, code }
  return Response.json(body, { status })
}

// Log estructurado (nunca loggear tokens ni contenido sensible)
export function logEvent(
  event: string,
  meta: Record<string, string | number | boolean | null>
) {
  console.log(JSON.stringify({ event, ...meta, ts: new Date().toISOString() }))
}

// Fecha de hoy en zona horaria del usuario (o UTC como fallback)
export function todayInTimezone(timezone: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(
    new Date()
  )
}

// Chequea si un access_token de OAuth está expirado (con margen de 60s)
export function isTokenExpired(expiresAt: Date | string): boolean {
  const expiresMs = new Date(expiresAt).getTime()
  return Date.now() >= expiresMs - 60_000
}

// Parsea respuesta tipada de la API en el cliente
export function parseApiResponse<T>(response: ApiResponse<T>): T {
  if (!response.success) throw new Error(response.error)
  return response.data
}
