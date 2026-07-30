import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {
  getMatchById, getMatchSets, updateMatch,
  deleteMatchSets, insertMatchSet,
  updateHistoricalStats, revertHistoricalStats,
} from '@/lib/db/queries'

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const match = await getMatchById(params.id)
  if (!match) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  const sets = await getMatchSets(params.id)
  return NextResponse.json({ data: { match, sets } })
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json()
  const { sets, matchUpdate, isCorrection } = body

  const existing = await getMatchById(params.id)
  if (!existing) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  // Si es corrección, revertir estadísticas anteriores
  if (isCorrection && existing.status === 'terminado') {
    await revertHistoricalStats(params.id)
  }

  try {
    // Borrar sets anteriores e insertar los nuevos
    await deleteMatchSets(params.id)
    for (const set of sets) {
      await insertMatchSet({
        ...set,
        match_id: params.id,
        tournament_id: existing.tournament_id,
        had_penalty: set.needs_penalty ?? set.had_penalty ?? false,
      })
    }

    // Actualizar el partido
    await updateMatch(params.id, matchUpdate)

    // Actualizar estadísticas históricas si el partido quedó terminado
    if (matchUpdate.status === 'terminado') {
      await updateHistoricalStats(params.id)
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('PUT /api/matches error:', e)
    return NextResponse.json({ error: e.message ?? 'Error al guardar' }, { status: 500 })
  }
}
