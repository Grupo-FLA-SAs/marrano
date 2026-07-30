import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getPlayerById, updatePlayer, countPlayerMatches } from '@/lib/db/queries'

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
