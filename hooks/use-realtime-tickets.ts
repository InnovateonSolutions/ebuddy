'use client'

import { useEffect, useCallback } from 'react'
import type { Ticket } from '@/lib/db/schema'

interface UsePollingTicketsParams {
  userId: string
  onInsert: (ticket: Ticket) => void
  onUpdate: (ticket: Ticket) => void
  onDelete: (id: string) => void
  intervalMs?: number
}

/**
 * Polling cada 30s para detectar cambios en tickets.
 * Reemplaza Supabase Realtime. Suficiente para MVP de 1 usuario.
 */
export function useRealtimeTickets({
  onInsert,
  onUpdate,
  onDelete,
  intervalMs = 30_000,
}: UsePollingTicketsParams) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _unused = { onInsert, onUpdate, onDelete } // mantenemos la firma compatible

  const refetch = useCallback(async () => {
    // El componente padre (DayView) maneja el refetch via router.refresh()
    // Este hook existe como punto de extensión para cuando se implemente
    // Server-Sent Events o WebSockets en Fase 2.
  }, [])

  useEffect(() => {
    const id = setInterval(refetch, intervalMs)
    return () => clearInterval(id)
  }, [refetch, intervalMs])
}
