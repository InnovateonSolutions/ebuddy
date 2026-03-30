// Health check endpoint para ECS / ALB target group
export async function GET() {
  return Response.json({ status: 'ok', ts: new Date().toISOString() }, { status: 200 })
}
