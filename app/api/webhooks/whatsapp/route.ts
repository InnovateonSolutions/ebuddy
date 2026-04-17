import { apiError } from '@/lib/utils'
import { createTicketFromCapturedInput } from '@/lib/capture'

const VERIFY_TOKEN = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN
const PHONE_ID = process.env.WHATSAPP_PHONE_NUMBER_ID
const WA_TOKEN = process.env.WHATSAPP_API_TOKEN

// GET — Meta challenge de verificación del webhook
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    return new Response(challenge, { status: 200 })
  }
  return new Response('Forbidden', { status: 403 })
}

// POST — Recibe mensajes entrantes de WhatsApp
export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return apiError('Body inválido', 'VALIDATION_ERROR')
  }

  const entry = (body as Record<string, unknown>)?.entry
  if (!Array.isArray(entry) || entry.length === 0) return new Response('ok', { status: 200 })

  const change = ((entry[0] as Record<string, unknown>)?.changes as unknown[] | undefined)?.[0]
  const value = (change as Record<string, unknown>)?.value as Record<string, unknown> | undefined
  const messages = value?.messages as Record<string, unknown>[] | undefined
  if (!messages?.length) return new Response('ok', { status: 200 })

  const msg = messages[0]
  if (msg.type !== 'text') return new Response('ok', { status: 200 })

  const rawText = (msg.text as Record<string, unknown>)?.body as string
  const from = msg.from as string
  if (!rawText?.trim()) return new Response('ok', { status: 200 })

  // Buscar userId del número de teléfono registrado (para MVP: userId del único usuario)
  // En producción: mapear `from` (número E.164) al userId via tabla usuarios
  const userId = process.env.WHATSAPP_OWNER_USER_ID
  if (!userId) return new Response('ok', { status: 200 })

  try {
    const ticket = await createTicketFromCapturedInput(userId, rawText, undefined, Date.now())
    await sendReply(from, `✓ ${ticket.context === 'NEGOCIO' ? 'Negocio' : 'Personal'} · ${ticket.title} · ${ticket.priority}`)
  } catch {
    await sendReply(from, '⚠️ No pude crear el ticket. Intenta de nuevo.')
  }

  return new Response('ok', { status: 200 })
}

async function sendReply(to: string, text: string) {
  if (!PHONE_ID || !WA_TOKEN) return
  await fetch(`https://graph.facebook.com/v19.0/${PHONE_ID}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${WA_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: text },
    }),
  })
}
