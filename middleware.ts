import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    // Si está autenticado e intenta ir a /login, redirigir a /
    if (req.nextUrl.pathname === '/login' && req.nextauth.token) {
      return NextResponse.redirect(new URL('/', req.url))
    }
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized({ token, req }) {
        const { pathname } = req.nextUrl
        // Rutas públicas: no requieren auth
        if (pathname.startsWith('/p/')) return true
        if (pathname.startsWith('/login')) return true
        if (pathname.startsWith('/api/auth')) return true
        // Todo lo demás requiere sesión
        return !!token
      },
    },
    pages: { signIn: '/login' },
  }
)

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
