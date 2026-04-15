import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

// Pool de conexiones compartido para toda la app.
// postgres.js maneja el pooling internamente — no crear múltiples instancias.
const client = postgres(process.env.DATABASE_URL!, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
})

export const db = drizzle(client, { schema })

export type DB = typeof db
