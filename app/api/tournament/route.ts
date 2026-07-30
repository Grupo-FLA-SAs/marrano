import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getActiveTournament, upsertTournament } from '@/lib/db/queries'

export async function GET() {
  const tournament = await getActiveTournament()
  return NextResponse.json({ data: tournament })
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  try {
    const body = await req.json()
    // Limpiar start_date vacío
    if (!body.start_date) body.start_date = null
    const tournament = await upsertTournament(body)
    return NextResponse.json({ data: tournament })
  } catch (e: any) {
    console.error('POST /api/tournament error:', e)
    return NextResponse.json({ error: e.message ?? 'Error al guardar' }, { status: 500 })
  }
}
