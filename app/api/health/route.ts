// Health check endpoint — usado por Docker healthcheck y smoke tests de CI
export async function GET() {
  return Response.json({ status: 'ok', ts: new Date().toISOString() }, { status: 200 })
}
