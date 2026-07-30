import { NextResponse } from 'next/server'

// El logout lo maneja NextAuth vía POST /api/auth/signout
// Esta ruta queda como alias para el botón del layout
export async function POST() {
  return NextResponse.redirect(
    new URL('/api/auth/signout', process.env.NEXTAUTH_URL ?? 'http://localhost:3000')
  )
}
