import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getPlayerById, updatePlayer, countPlayerMatches } from '@/lib/db/queries'
import { sql } from '@/lib/db'

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const player = await getPlayerById(params.id)
  if (!player) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  const matchCount = await countPlayerMatches(params.id)
  return NextResponse.json({ data: player, matchCount })
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json()
  const player = await updatePlayer(params.id, body)
  return NextResponse.json({ data: player })
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const matchCount = await countPlayerMatches(params.id)
  if (matchCount > 0) {
    return NextResponse.json(
      { error: 'No se puede eliminar: el jugador tiene partidos registrados.' },
      { status: 400 }
    )
  }

  await sql`DELETE FROM historical_stats WHERE player_id = ${params.id}`
  await sql`DELETE FROM group_members WHERE player_id = ${params.id}`
  await sql`DELETE FROM players WHERE id = ${params.id}`
  return NextResponse.json({ ok: true })
}
