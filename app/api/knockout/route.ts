import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {
  getActiveTournament, getKnockoutSeeds, getKnockoutMatches,
  deleteKnockoutSeeds, insertKnockoutSeed,
  deleteKnockoutMatches, insertKnockoutMatch,
  getHistoricalStats, getPlayers, getLastPhaseQualifiedPlayers,
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
      getLastPhaseQualifiedPlayers(tournament.id),
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

  // Borra las semis actuales y las recrea con los pares correctos del bracket
  if (body.action === 'fix_semis') {
    const allMatches = await getKnockoutMatches(tournament.id)
    const seeds      = await getKnockoutSeeds(tournament.id)
    const oct = (allMatches as any[]).filter(m => m.knockout_round === 'octavos')
    const qtr = (allMatches as any[]).filter(m => m.knockout_round === 'cuartos')

    // Identifica cada cuarto por ganadores de sus octavos (mismo algoritmo que BracketView)
    function bySeeds(sA: number, sB: number) {
      const pA = (seeds as any[]).find(s => s.seed_number === sA)?.player_id
      const pB = (seeds as any[]).find(s => s.seed_number === sB)?.player_id
      if (!pA || !pB) return undefined
      return oct.find(m => (m.player_a_id === pA && m.player_b_id === pB) || (m.player_a_id === pB && m.player_b_id === pA))
    }
    function byWinners(pool: any[], mA: any, mB: any) {
      const wA = mA?.winner_id; const wB = mB?.winner_id
      if (!wA || !wB) return undefined
      return pool.find(m => (m.player_a_id === wA && m.player_b_id === wB) || (m.player_a_id === wB && m.player_b_id === wA))
    }

    const m1 = bySeeds(1,16); const m5 = bySeeds(5,12)
    const m7 = bySeeds(7,10); const m3 = bySeeds(3,14)
    const m2 = bySeeds(2,15); const m6 = bySeeds(6,11)
    const m8 = bySeeds(8, 9); const m4 = bySeeds(4,13)

    const qL0 = byWinners(qtr, m1, m5)
    const qL1 = byWinners(qtr, m7, m3)
    const qR0 = byWinners(qtr, m2, m6)
    const qR1 = byWinners(qtr, m8, m4)

    // Semi correcta: IZQ winner vs IZQ winner, DER winner vs DER winner
    const semiL = { player_a_id: qL0?.winner_id, player_b_id: qL1?.winner_id }
    const semiR = { player_a_id: qR0?.winner_id, player_b_id: qR1?.winner_id }

    if (!semiL.player_a_id || !semiL.player_b_id || !semiR.player_a_id || !semiR.player_b_id) {
      return NextResponse.json({ error: 'Faltan ganadores de cuartos para generar semis' }, { status: 400 })
    }

    await deleteKnockoutMatches(tournament.id, 'semifinal')
    await insertKnockoutMatch({ ...semiL, tournament_id: tournament.id, knockout_round: 'semifinal' })
    await insertKnockoutMatch({ ...semiR, tournament_id: tournament.id, knockout_round: 'semifinal' })

    return NextResponse.json({ ok: true })
  }

  // Inserta partidos directamente (pares calculados en el frontend)
  if (body.action === 'create_matches') {
    const pairs = body.pairs as Array<{ player_a_id: string; player_b_id: string; knockout_round: string }>
    if (!Array.isArray(pairs) || pairs.length === 0) {
      return NextResponse.json({ error: 'No hay pares para crear' }, { status: 400 })
    }
    for (const p of pairs) {
      await insertKnockoutMatch({ ...p, tournament_id: tournament.id })
    }
    return NextResponse.json({ ok: true, created: pairs.length })
  }

  // Genera la siguiente ronda progresivamente: por cada par completo, crea el partido si no existe
  if (body.action === 'advance_pairs') {
    const { currentRound, nextRound } = body
    const allMatches = await getKnockoutMatches(tournament.id)
    const currentMatches = (allMatches as any[]).filter(m => m.knockout_round === currentRound)
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
    const nextMatches = (allMatches as any[]).filter(m => m.knockout_round === nextRound)

    let created = 0
    const pairCount = Math.floor(currentMatches.length / 2)
    for (let i = 0; i < pairCount; i++) {
      const mA = currentMatches[i * 2]
      const mB = currentMatches[i * 2 + 1]
      if (!mA?.winner_id || !mB?.winner_id) continue  // par incompleto

      // Verificar si ya existe un partido entre estos dos ganadores
      const winA = mA.winner_id as string
      const winB = mB.winner_id as string
      const exists = nextMatches.some((nm: any) =>
        (nm.player_a_id === winA && nm.player_b_id === winB) ||
        (nm.player_a_id === winB && nm.player_b_id === winA)
      )
      if (exists) continue

      await insertKnockoutMatch({
        player_a_id: winA,
        player_b_id: winB,
        tournament_id: tournament.id,
        knockout_round: nextRound,
      })
      created++
    }

    return NextResponse.json({ ok: true, created })
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
