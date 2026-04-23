import { createTicketFromCapturedInput } from '@/features/tickets/server/capture'

export async function POST(request: Request) {
  const token = process.env.OPENCLAW_HOOK_TOKEN
  if (!token) return new Response('Webhook no configurado', { status: 503 })

  const auth = request.headers.get('authorization') ?? ''
  if (auth !== `Bearer ${token}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const ownerUserId = process.env.WHATSAPP_OWNER_USER_ID
  if (!ownerUserId) return new Response('Owner no configurado', { status: 503 })

  let body: { text?: string }
  try {
    body = await request.json()
  } catch {
    return new Response('Body inválido', { status: 400 })
  }

  const text = body.text?.trim()
  if (!text) return new Response('text requerido', { status: 400 })

  try {
    const ticket = await createTicketFromCapturedInput(ownerUserId, text, undefined, Date.now())
    return Response.json({
      ok: true,
      ticket: {
        id: ticket.id,
        title: ticket.title,
        priority: ticket.priority,
        context: ticket.context,
        dueDate: ticket.dueDate,
      },
      message: `✓ ${ticket.context === 'NEGOCIO' ? 'Negocio' : 'Personal'} · ${ticket.title} · ${ticket.priority}`,
    })
  } catch {
    return Response.json({ ok: false, message: '⚠️ No pude crear el ticket. Intenta de nuevo.' }, { status: 500 })
  }
}
