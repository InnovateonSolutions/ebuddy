import { getSystemStatus } from '@/lib/status'

export async function GET() {
  return Response.json(await getSystemStatus(), { status: 200 })
}
