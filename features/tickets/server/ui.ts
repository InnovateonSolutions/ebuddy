import type { TicketStatus } from '@/lib/types'

export const STATUS_CYCLE: TicketStatus[] = ['PENDING', 'IN_PROGRESS', 'QA', 'DONE']

export function getNextTicketStatus(status: TicketStatus): TicketStatus {
  const currentIndex = STATUS_CYCLE.indexOf(status)
  return STATUS_CYCLE[(currentIndex + 1) % STATUS_CYCLE.length]
}

export function formatTicketDate(dateStr: string): string {
  return new Intl.DateTimeFormat('es-MX', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(dateStr + 'T00:00:00'))
}
