import { db } from '@/lib/db'
import { visitCounter } from '@/lib/db/schema'
import { sql } from 'drizzle-orm'

// POST /api/visits — incrementa el contador global y devuelve el nuevo valor.
// No requiere autenticación: el contador es visible en todas las pantallas.
export async function POST() {
  try {
    const rows = await db
      .update(visitCounter)
      .set({
        count: sql`${visitCounter.count} + 1`,
        updatedAt: sql`now()`,
      })
      .returning({ count: visitCounter.count })

    return Response.json({ count: rows[0]?.count ?? 0 })
  } catch {
    return Response.json({ count: 0 })
  }
}
