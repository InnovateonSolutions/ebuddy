import { createTicketFromCapturedInput } from '@/features/tickets/server/capture'
import { sendWhatsAppReply } from '@/features/messaging/whatsapp/server/reply'
import type { WhatsAppTextMessage } from '@/features/messaging/whatsapp/server/types'

const VERIFY_TOKEN = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN
const OWNER_USER_ID = process.env.WHATSAPP_OWNER_USER_ID

export function createWhatsAppChallengeResponse(request: Request) {
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (VERIFY_TOKEN && mode === 'subscribe' && token === VERIFY_TOKEN) {
    return new Response(challenge, { status: 200 })
  }

  return new Response('Forbidden', { status: 403 })
}

function extractIncomingTextMessage(body: unknown): WhatsAppTextMessage | null {
  const entry = (body as Record<string, unknown>)?.entry
  if (!Array.isArray(entry) || entry.length === 0) return null

  const change = ((entry[0] as Record<string, unknown>)?.changes as unknown[] | undefined)?.[0]
  const value = (change as Record<string, unknown>)?.value as Record<string, unknown> | undefined
  const messages = value?.messages as Record<string, unknown>[] | undefined
  if (!messages?.length) return null

  const message = messages[0]
  if (message.type !== 'text') return null

  const rawText = (message.text as Record<string, unknown>)?.body as string
  const from = message.from as string

  if (!rawText?.trim() || !from) return null
  return { from, rawText }
}

export async function handleIncomingWhatsAppWebhook(body: unknown) {
  const message = extractIncomingTextMessage(body)
  if (!message || !OWNER_USER_ID) return

  try {
    const ticket = await createTicketFromCapturedInput(
      OWNER_USER_ID,
      message.rawText,
      undefined,
      Date.now()
    )
    await sendWhatsAppReply(
      message.from,
      `✓ ${ticket.context === 'NEGOCIO' ? 'Negocio' : 'Personal'} · ${ticket.title} · ${ticket.priority}`
    )
  } catch {
    await sendWhatsAppReply(message.from, '⚠️ No pude crear el ticket. Intenta de nuevo.')
  }
}
