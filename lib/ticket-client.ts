import type { ApiResponse, Ticket, UpdateTicketInput } from '@/lib/types'

export async function updateTicket(
  ticketId: string,
  input: UpdateTicketInput
): Promise<ApiResponse<Ticket>> {
  const response = await fetch(`/api/tickets/${ticketId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })

  return response.json() as Promise<ApiResponse<Ticket>>
}

export async function deleteTicket(
  ticketId: string
): Promise<ApiResponse<{ deleted: true }>> {
  const response = await fetch(`/api/tickets/${ticketId}`, {
    method: 'DELETE',
  })

  return response.json() as Promise<ApiResponse<{ deleted: true }>>
}
