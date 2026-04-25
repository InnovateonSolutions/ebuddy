import { requireCapability } from '@/lib/auth/permissions'
import { addObsidianContextToChatBody } from '@/lib/campaign/obsidian'
import { env } from '@/lib/env'
import { apiError } from '@/lib/utils'

export async function POST(request: Request) {
  const authz = await requireCapability('gateway.execute', request, {
    action: 'gateway.chat',
    resource: '/api/gateway/chat',
  })
  if ('response' in authz) return authz.response

  const baseUrl = env.openclawBaseUrl.replace(/\/$/, '')
  if (!baseUrl) {
    return apiError('Gateway no configurado', 'AI_UPSTREAM_ERROR', 503)
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return apiError('Body inválido', 'VALIDATION_ERROR', 400)
  }

  const proxiedBody = await addObsidianContextToChatBody(body)

  const upstream = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.openclawGatewayToken}`,
    },
    body: JSON.stringify(proxiedBody),
    signal: AbortSignal.timeout(30000),
  })

  const data = await upstream.json()
  return Response.json(data, { status: upstream.status })
}
