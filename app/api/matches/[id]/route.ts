import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {
  getMatchById, getMatchSets, saveMatchResult,
  updateHistoricalStats, revertHistoricalStats,
  type MatchSetInput,
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

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const { sets, matchUpdate, isCorrection } = body ?? {}
  if (!Array.isArray(sets) || sets.length === 0) {
    return NextResponse.json({ error: 'Debes enviar al menos un set' }, { status: 400 })
  }
  if (!matchUpdate || matchUpdate.status !== 'terminado') {
    return NextResponse.json({ error: 'matchUpdate.status debe ser terminado' }, { status: 400 })
  }
  if (!matchUpdate.winner_id) {
    return NextResponse.json({ error: 'Falta el ganador del partido' }, { status: 400 })
  }

  const existing = await getMatchById(params.id) as any
  if (!existing) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  const normalizedSets: MatchSetInput[] = sets.map((set: any, i: number) => ({
    set_number: set.set_number ?? i + 1,
    player_a_carambolas: Number(set.player_a_carambolas ?? 0),
    player_b_carambolas: Number(set.player_b_carambolas ?? 0),
    player_a_entries: Number(set.player_a_entries ?? 1),
    player_b_entries: Number(set.player_b_entries ?? 1),
    player_a_handicap: Number(set.player_a_handicap ?? existing.player_a?.handicap),
    player_b_handicap: Number(set.player_b_handicap ?? existing.player_b?.handicap),
    winner_id: set.had_penalty || set.needs_penalty
      ? (set.penalty_winner_id ?? set.winner_id)
      : set.winner_id,
    had_penalty: Boolean(set.needs_penalty ?? set.had_penalty ?? false),
    penalty_winner_id: set.penalty_winner_id ?? null,
  }))

  for (const set of normalizedSets) {
    if (!set.winner_id) {
      return NextResponse.json(
        { error: `Set ${set.set_number}: falta determinar el ganador` },
        { status: 400 }
      )
    }
  }

  // Corrección: revertir stats anteriores (best-effort, no bloquea el guardado)
  if (isCorrection && existing.status === 'terminado') {
    try {
      await revertHistoricalStats(params.id)
    } catch (e) {
      console.error('revertHistoricalStats (non-blocking):', e)
    }
  }

  try {
    // Crítico: sets + partido en una sola transacción
    await saveMatchResult(
      params.id,
      existing.tournament_id,
      normalizedSets,
      {
        status: 'terminado',
        winner_id: matchUpdate.winner_id,
        score_a: Number(matchUpdate.score_a ?? 0),
        score_b: Number(matchUpdate.score_b ?? 0),
      }
    )
  } catch (e: any) {
    console.error('PUT /api/matches save error:', e)
    return NextResponse.json(
      { error: e?.message ?? 'Error al guardar el marcador' },
      { status: 500 }
    )
  }

  // Stats históricas fuera del flujo crítico: si fallan, el marcador YA quedó guardado
  let statsOk = true
  try {
    await updateHistoricalStats(params.id)
  } catch (e) {
    statsOk = false
    console.error('updateHistoricalStats (non-blocking):', e)
  }

  return NextResponse.json({ ok: true, statsOk })
}
