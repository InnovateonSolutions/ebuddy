const PHONE_ID = process.env.WHATSAPP_PHONE_NUMBER_ID
const WA_TOKEN = process.env.WHATSAPP_API_TOKEN

export async function sendWhatsAppReply(to: string, text: string) {
  if (!PHONE_ID || !WA_TOKEN) return

  await fetch(`https://graph.facebook.com/v19.0/${PHONE_ID}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${WA_TOKEN}`,
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
