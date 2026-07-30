import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getActiveTournament, getPlayers, createPlayer } from '@/lib/db/queries'

export async function GET() {
  const tournament = await getActiveTournament()
  if (!tournament) return NextResponse.json({ data: [] })
  const players = await getPlayers(tournament.id)
  return NextResponse.json({ data: players })
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const tournament = await getActiveTournament()
  if (!tournament) return NextResponse.json({ error: 'No hay torneo activo' }, { status: 400 })

  const body = await req.json()
  const player = await createPlayer({ ...body, tournament_id: tournament.id })
  return NextResponse.json({ data: player })
}
