'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Ticket } from '@/types/database'

interface UseRealtimeTicketsParams {
  userId: string
  onInsert: (ticket: Ticket) => void
  onUpdate: (ticket: Ticket) => void
  onDelete: (id: string) => void
}

/**
 * Suscribe a cambios en tiempo real de la tabla tickets via Supabase Realtime.
 * Actualiza el estado local automáticamente sin necesidad de polling.
 */
export function useRealtimeTickets({
  userId,
  onInsert,
  onUpdate,
  onDelete,
}: UseRealtimeTicketsParams) {
  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel(`tickets:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'tickets',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          onInsert(payload.new as Ticket)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tickets',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          onUpdate(payload.new as Ticket)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'tickets',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          onDelete((payload.old as { id: string }).id)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, onInsert, onUpdate, onDelete])
}
