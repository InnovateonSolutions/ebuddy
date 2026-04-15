import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

const databaseUrl = process.env.DATABASE_URL

// Permite levantar la app en modo bootstrap sin DB todavía configurada.
export const db = databaseUrl
  ? drizzle(postgres(databaseUrl, {
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
    }), { schema })
  : ({} as ReturnType<typeof drizzle>)

export type DB = typeof db
