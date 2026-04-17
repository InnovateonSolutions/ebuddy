import { Resend } from 'resend'
import type { Ticket } from '@/lib/types'

export async function sendDueTicketsEmail(to: string, tickets: Ticket[]) {
  if (!tickets.length) return

  const resend = new Resend(process.env.RESEND_API_KEY)
  const FROM = process.env.EMAIL_FROM ?? 'ebuddy <noreply@ebuddy.io>'
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://ebuddy.innovateoncorp.com'

  const PRIORITY_LABEL: Record<string, string> = { ALTA: '🔴 Alta', MEDIA: '🟡 Media', BAJA: '⚪ Baja' }

  const rows = tickets
    .map((t) => `• [${PRIORITY_LABEL[t.priority] ?? t.priority}] ${t.title}`)
    .join('\n')

  const html = `
<h2 style="font-family:sans-serif;color:#1e293b">Tareas pendientes para hoy</h2>
<p style="font-family:sans-serif;color:#64748b">Tienes ${tickets.length} ticket${tickets.length !== 1 ? 's' : ''} con fecha límite hoy:</p>
<ul style="font-family:sans-serif;color:#1e293b">
${tickets.map((t) => `<li><strong>${t.title}</strong> — ${PRIORITY_LABEL[t.priority] ?? t.priority}</li>`).join('')}
</ul>
<p style="font-family:sans-serif"><a href="${APP_URL}/today" style="color:#2563eb">Ver en ebuddy →</a></p>
`.trim()

  await resend.emails.send({
    from: FROM,
    to,
    subject: `ebuddy: ${tickets.length} tarea${tickets.length !== 1 ? 's' : ''} pendiente${tickets.length !== 1 ? 's' : ''} hoy`,
    text: `Tareas pendientes para hoy:\n\n${rows}\n\n${APP_URL}/today`,
    html,
  })
}
