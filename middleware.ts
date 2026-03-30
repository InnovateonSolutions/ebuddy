import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { CookieOptions } from '@supabase/ssr'

// Rutas que no requieren autenticación
const PUBLIC_PATHS = [
  '/login',
  '/auth/callback',
  '/api/auth/callback',
  '/api/auth/calendar/google/callback',
  '/api/auth/calendar/microsoft/callback',
]

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refrescar sesión si está por expirar
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
  const isPublicPath = PUBLIC_PATHS.some((p) => pathname.startsWith(p))
  const isApiRoute = pathname.startsWith('/api/')
  const isStaticAsset = pathname.startsWith('/_next/')

  // No procesar assets estáticos
  if (isStaticAsset) return response

  // Rutas de API sin autenticación: las rutas de API de negocio
  // necesitan autenticación. Las devuelven 401 ellas mismas.
  if (isApiRoute && !isPublicPath) {
    if (!user) {
      return Response.json(
        { success: false, error: 'No autorizado', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }
    // Inyectar userId en headers para que los handlers lo lean de forma segura
    response.headers.set('x-user-id', user.id)
    return response
  }

  // Redirigir al login si no está autenticado
  if (!user && !isPublicPath) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Redirigir al dashboard si ya está autenticado e intenta acceder al login
  if (user && pathname === '/login') {
    return NextResponse.redirect(new URL('/today', request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
