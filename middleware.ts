import { auth } from '@/lib/auth/config'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_PATHS = [
  '/login',
  '/api/auth',
  '/api/health',
  '/api/status',
  '/api/webhooks',
  '/status',
]

export default auth((req: NextRequest & { auth: { user?: { id?: string } } | null }) => {
  const { pathname } = req.nextUrl
  const session = req.auth
  const isRootPath = pathname === '/'
  const isPublicPath = isRootPath || PUBLIC_PATHS.some((p) => pathname.startsWith(p))
  const isStaticAsset = pathname.startsWith('/_next/')

  if (isStaticAsset) return NextResponse.next()

  // Rutas de API protegidas: inyectar userId en header
  if (pathname.startsWith('/api/') && !isPublicPath) {
    if (!session?.user?.id) {
      return Response.json(
        { success: false, error: 'No autorizado', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    const requestHeaders = new Headers(req.headers)
    requestHeaders.set('x-user-id', session.user.id)
    return NextResponse.next({ request: { headers: requestHeaders } })
  }

  // Páginas protegidas: redirigir al login
  if (!session?.user && !isPublicPath) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // Ya autenticado e intenta ir al login
  if (session?.user && pathname === '/login') {
    return NextResponse.redirect(new URL('/today', req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
