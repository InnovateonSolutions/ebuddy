import { apiError } from '@/lib/utils'
import {
  createWhatsAppChallengeResponse,
  handleIncomingWhatsAppWebhook,
} from '@/features/messaging/whatsapp/server/service'

// GET — Meta challenge de verificación del webhook
export async function GET(request: Request) {
  return createWhatsAppChallengeResponse(request)
}

// POST — Recibe mensajes entrantes de WhatsApp
export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return apiError('Body inválido', 'VALIDATION_ERROR')
  }

  await handleIncomingWhatsAppWebhook(body)
  return new Response('ok', { status: 200 })
}
