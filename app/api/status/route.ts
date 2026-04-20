import { getSystemStatus } from '@/features/status/server/service'

export async function GET() {
  return Response.json(await getSystemStatus(), { status: 200 })
}
