import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {
  getActiveTournament, getKnockoutSeeds, getKnockoutMatches,
  deleteKnockoutSeeds, insertKnockoutSeed,
  deleteKnockoutMatches, insertKnockoutMatch,
  getHistoricalStats, getPlayers, getQualifiedPlayers,
} from '@/lib/db/queries'
import { rankPlayers, assignSeeds } from '@/lib/business/ranking'
import { generateOctavosCruces, getRoundWinners, generateNextRoundPairs } from '@/lib/business/knockout'

export async function GET() {
  const tournament = await getActiveTournament()
  if (!tournament) return NextResponse.json({ data: null })

  const [seeds, matches, players] = await Promise.all([
    getKnockoutSeeds(tournament.id),
    getKnockoutMatches(tournament.id),
    getPlayers(tournament.id),
  ])

  return NextResponse.json({ data: { tournament, seeds, matches, players } })
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json()
  const tournament = await getActiveTournament()
  if (!tournament) return NextResponse.json({ error: 'No hay torneo activo' }, { status: 400 })

  if (body.action === 'generate_seeds') {
    const [players, statsRows, qualifiedRows] = await Promise.all([
      getPlayers(tournament.id),
      getHistoricalStats(tournament.id),
      getQualifiedPlayers(tournament.id),
    ])

    const statsMap = new Map(statsRows.map((s: any) => [s.player_id, s]))
    let ranked = rankPlayers(players as any, statsMap as any)
    const qualifiedIds = qualifiedRows.map((q: any) => q.player_id)
    ranked = assignSeeds(ranked, qualifiedIds)

    const qualified16 = ranked
      .filter(r => r.seed_position !== null)
      .sort((a, b) => (a.seed_position ?? 99) - (b.seed_position ?? 99))
      .slice(0, 16)

    if (qualified16.length !== 16) {
      return NextResponse.json({
        error: `Se necesitan exactamente 16 clasificados. Hay ${qualified16.length}.`
      }, { status: 400 })
    }

    await deleteKnockoutSeeds(tournament.id)
    const seedRows = qualified16.map((r, i) => ({
      tournament_id: tournament.id,
      player_id: r.player.id,
      seed_number: i + 1,
      historical_position: r.position,
    }))
    for (const s of seedRows) await insertKnockoutSeed(s)

    await deleteKnockoutMatches(tournament.id, 'octavos')
    const cruces = generateOctavosCruces(seedRows as any)
    for (const c of cruces) {
      await insertKnockoutMatch({ ...c, tournament_id: tournament.id, knockout_round: 'octavos' })
    }

    return NextResponse.json({ ok: true })
  }

  if (body.action === 'next_round') {
    const { currentRound, nextRound } = body
    const matches = await getKnockoutMatches(tournament.id)
    const currentMatches = matches.filter((m: any) => m.knockout_round === currentRound)
    const winners = getRoundWinners(currentMatches as any)
    const pairs = generateNextRoundPairs(winners)

    for (const p of pairs) {
      await insertKnockoutMatch({ ...p, tournament_id: tournament.id, knockout_round: nextRound })
    }

    // Tercer puesto
    if (nextRound === 'final' && tournament.has_third_place_match) {
      const semiMatches = matches.filter((m: any) => m.knockout_round === 'semifinal')
      const losers = semiMatches
        .filter((m: any) => m.winner_id)
        .map((m: any) => m.winner_id === m.player_a_id ? m.player_b_id : m.player_a_id)

      if (losers.length === 2) {
        await insertKnockoutMatch({
          tournament_id: tournament.id,
          player_a_id: losers[0],
          player_b_id: losers[1],
          knockout_round: 'tercer_puesto',
        })
      }
    }

    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Acción desconocida' }, { status: 400 })
}
