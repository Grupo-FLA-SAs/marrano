import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getActiveTournament, upsertTournament } from '@/lib/db/queries'
import { sql } from '@/lib/db'

export async function GET() {
  const tournament = await getActiveTournament()
  return NextResponse.json({ data: tournament })
}

// Cerrar torneo
export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json()
  if (body.action !== 'close') return NextResponse.json({ error: 'Acción desconocida' }, { status: 400 })

  const tournament = await getActiveTournament()
  if (!tournament) return NextResponse.json({ error: 'No hay torneo activo' }, { status: 400 })

  const rows = await sql`
    UPDATE tournaments SET status = 'finalizado', updated_at = NOW()
    WHERE id = ${tournament.id}
    RETURNING *
  `
  return NextResponse.json({ data: rows[0] })
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
