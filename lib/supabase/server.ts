import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'
import type { CookieOptions } from '@supabase/ssr'

// Cliente para Server Components, API Routes y Server Actions.
// Usa las cookies del request para mantener la sesión del usuario.
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // En Server Components solo de lectura esto falla silenciosamente.
            // El Middleware es quien actualiza las cookies de sesión.
          }
        },
      },
    }
  )
}

// Cliente con Service Role para operaciones admin (mutations del servidor).
// NUNCA usar en el cliente ni exponer al navegador.
export async function createAdminClient() {
  const { createClient: createSupabaseClient } = await import(
    '@supabase/supabase-js'
  )
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
