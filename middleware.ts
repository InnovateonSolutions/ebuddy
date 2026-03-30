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

  // Rutas de API: requieren autenticación.
  if (isApiRoute && !isPublicPath) {
    if (!user) {
      return Response.json(
        { success: false, error: 'No autorizado', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    // Inyectar userId en los headers del REQUEST (no del response).
    // NextResponse.next({ request: { headers } }) es el único mecanismo
    // en Next.js App Router para pasar datos del middleware al route handler.
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-user-id', user.id)
    const apiResponse = NextResponse.next({ request: { headers: requestHeaders } })

    // Propagar Set-Cookie del refresh de sesión de Supabase al cliente
    response.headers.forEach((value, key) => {
      if (key.toLowerCase() === 'set-cookie') {
        apiResponse.headers.append(key, value)
      }
    })

    return apiResponse
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
