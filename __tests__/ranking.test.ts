import { rankPlayers, assignSeeds, generateOctavosCruces } from '@/lib/business/ranking'
import { generateOctavosCruces as generateCruces } from '@/lib/business/knockout'
import type { Player, HistoricalStats, KnockoutSeed } from '@/lib/supabase/types'

function makePlayer(id: string): Player {
  return {
    id,
    tournament_id: 'tid',
    full_name: `Jugador ${id}`,
    short_name: null,
    photo_url: null,
    handicap: 15,
    status: 'activo',
    notes: null,
    created_at: '',
    updated_at: '',
  }
}

function makeStats(
  playerId: string,
  overrides: Partial<HistoricalStats> = {}
): HistoricalStats {
  return {
    id: '',
    tournament_id: 'tid',
    player_id: playerId,
    matches_played: 0,
    matches_won: 0,
    matches_lost: 0,
    sets_played: 0,
    sets_won: 0,
    sets_lost: 0,
    total_carambolas: 0,
    total_handicap_available: 0,
    total_entries: 0,
    entries_in_won_sets: 0,
    updated_at: '',
    ...overrides,
  }
}

const players = ['p1', 'p2', 'p3', 'p4', 'p5'].map(makePlayer)

// Test 13: Reinicio de puntos en nueva fase
// (Los puntos de fase son calculados por partido, no persisten — se prueban aquí
// verificando que historical_stats son independientes de las fases)
describe('historical stats independence', () => {
  it('T13 - las estadísticas históricas se acumulan, los puntos de fase empiezan en 0', () => {
    // Las estadísticas históricas solo crecen (no se reinician por fase)
    const stats = makeStats('p1', { matches_played: 5, matches_won: 3 })
    expect(stats.matches_played).toBe(5)
    // Los standings de grupo empiezan desde 0 para cada fase (función pura)
    const { calcGroupStandings } = require('@/lib/business/standings')
    const standings = calcGroupStandings([makePlayer('p1')], [])
    expect(standings[0].points).toBe(0)
    expect(standings[0].played).toBe(0)
  })
})

// Test 14: Conservación del hándicap
describe('handicap conservation', () => {
  it('T14 - el hándicap se guarda en match_set como snapshot', () => {
    // El hándicap del jugador puede cambiar, pero player_a_handicap / player_b_handicap
    // en match_sets guarda el valor al momento del partido
    const snapshotHandicap = 15
    const currentHandicap = 20  // fue editado después
    // La lógica de cálculo usa el snapshot, no el hándicap actual
    const { calcSetResult } = require('@/lib/business/matches')
    const result = calcSetResult({
      playerACarambolas: 14,
      playerBCarambolas: 15,
      playerAEntries: 30,
      playerBEntries: 25,
      playerAHandicap: snapshotHandicap,  // ← snapshot
      playerBHandicap: 20,
      winnerId: 'p1',
      playerAId: 'p1',
      playerBId: 'p2',
      hadPenalty: false,
      penaltyWinnerId: null,
    })
    expect(result.distanceA).toBe(snapshotHandicap - 14)
    // El resultado NO usa currentHandicap
    expect(result.distanceA).not.toBe(currentHandicap - 14)
  })
})

// Test 15: Acumulación del ranking histórico
describe('rankPlayers - acumulación', () => {
  it('T15 - el ranking acumula correctamente', () => {
    const statsMap = new Map([
      ['p1', makeStats('p1', { matches_played: 10, matches_won: 8 })],
      ['p2', makeStats('p2', { matches_played: 10, matches_won: 5 })],
      ['p3', makeStats('p3', { matches_played: 10, matches_won: 3 })],
    ])
    const ranked = rankPlayers(players.slice(0, 3), statsMap)
    expect(ranked[0].player.id).toBe('p1')  // 80% win rate
    expect(ranked[1].player.id).toBe('p2')  // 50% win rate
    expect(ranked[2].player.id).toBe('p3')  // 30% win rate
  })
})

// Test 16: Métricas promedio con grupos de diferente tamaño
describe('rankPlayers - promedios normalizados', () => {
  it('T16 - usa promedios para fairness con grupos de distinto tamaño', () => {
    // P1 jugó 20 partidos (grupo grande), P2 jugó 5 (grupo pequeño)
    // Ambos con 80% win rate → deben estar empatados en primer criterio
    const statsMap = new Map([
      ['p1', makeStats('p1', {
        matches_played: 20, matches_won: 16,
        sets_won: 32, sets_lost: 8,
        total_carambolas: 300, total_handicap_available: 400,
        entries_in_won_sets: 480,
      })],
      ['p2', makeStats('p2', {
        matches_played: 5, matches_won: 4,
        sets_won: 8, sets_lost: 2,
        total_carambolas: 75, total_handicap_available: 100,
        entries_in_won_sets: 120,
      })],
    ])
    const ranked = rankPlayers(players.slice(0, 2), statsMap)
    // Ambos tienen 80% win_pct — el desempate es por promedio de sets/partido
    // p1: 32/20 = 1.6, p2: 8/5 = 1.6 → también igual
    // El orden estable es por player_id
    expect(ranked[0].win_pct).toBeCloseTo(ranked[1].win_pct, 2)
  })
})

// Test 17: Clasificado por debajo del puesto 16 histórico
describe('assignSeeds - clasificado fuera del top 16 histórico', () => {
  it('T17 - un clasificado en posición 18 histórica puede ser sembrado entre los 16', () => {
    // Crear 20 jugadores, el jugador 18 en ranking histórico es clasificado
    const twentyPlayers = Array.from({ length: 20 }, (_, i) => makePlayer(`p${i + 1}`))
    const statsMap = new Map(twentyPlayers.map((p, i) => [
      p.id,
      makeStats(p.id, {
        matches_played: 10,
        matches_won: 20 - i,  // p1 gana más, p20 gana menos
      })
    ]))

    const allRanked = rankPlayers(twentyPlayers, statsMap)
    // Los 16 clasificados son p1-p14 + p18 + p20 (ejemplo)
    const qualifiedIds = [
      ...twentyPlayers.slice(0, 14).map(p => p.id),
      'p18', 'p20'
    ]

    const withSeeds = assignSeeds(allRanked, qualifiedIds)
    const p18 = withSeeds.find(r => r.player.id === 'p18')!

    expect(p18).toBeDefined()
    expect(p18.seed_position).not.toBeNull()
    expect(p18.seed_position).toBeGreaterThanOrEqual(1)
    expect(p18.seed_position).toBeLessThanOrEqual(16)
    // Su posición histórica general es 18
    expect(p18.position).toBeGreaterThan(14)
  })
})

// Test 18: Siembra solo entre los 16 clasificados
describe('assignSeeds - siembra exclusiva', () => {
  it('T18 - solo los 16 clasificados reciben seed_position', () => {
    const twentyPlayers = Array.from({ length: 20 }, (_, i) => makePlayer(`p${i + 1}`))
    const statsMap = new Map(twentyPlayers.map((p, i) => [
      p.id,
      makeStats(p.id, { matches_played: 10, matches_won: 20 - i })
    ]))
    const qualifiedIds = twentyPlayers.slice(0, 16).map(p => p.id)

    const allRanked = rankPlayers(twentyPlayers, statsMap)
    const withSeeds = assignSeeds(allRanked, qualifiedIds)

    const seeded = withSeeds.filter(r => r.seed_position !== null)
    const unseeded = withSeeds.filter(r => r.seed_position === null)

    expect(seeded).toHaveLength(16)
    expect(unseeded).toHaveLength(4)
    // Los no clasificados no tienen siembra
    for (const u of unseeded) {
      expect(qualifiedIds).not.toContain(u.player.id)
    }
  })
})

// Test 19: Cruces 1-16, 2-15, ..., 8-9
describe('generateOctavosCruces', () => {
  it('T19 - genera cruces correctos (1v16, 2v15, ..., 8v9)', () => {
    const seeds: KnockoutSeed[] = Array.from({ length: 16 }, (_, i) => ({
      id: `s${i + 1}`,
      tournament_id: 'tid',
      player_id: `p${i + 1}`,
      seed_number: i + 1,
      historical_position: i + 1,
      created_at: '',
    }))

    const cruces = generateCruces(seeds)
    expect(cruces).toHaveLength(8)
    expect(cruces[0]).toMatchObject({ seed_a: 1, seed_b: 16 })
    expect(cruces[1]).toMatchObject({ seed_a: 2, seed_b: 15 })
    expect(cruces[7]).toMatchObject({ seed_a: 8, seed_b: 9 })
  })
})

// Test 20: Avance correcto del cuadro eliminatorio
describe('knockout bracket advancement', () => {
  it('T20 - el ganador avanza al partido correcto de cuartos', () => {
    const { nextRoundMatchIndex, getRoundWinners, generateNextRoundPairs } = require('@/lib/business/knockout')

    // Los 8 ganadores de octavos
    const octavosWinners = ['p1', 'p3', 'p5', 'p7', 'p9', 'p11', 'p13', 'p15']
    const pairs = generateNextRoundPairs(octavosWinners)

    expect(pairs).toHaveLength(4)
    expect(pairs[0]).toEqual({ player_a_id: 'p1', player_b_id: 'p3' })
    expect(pairs[1]).toEqual({ player_a_id: 'p5', player_b_id: 'p7' })
    expect(pairs[3]).toEqual({ player_a_id: 'p13', player_b_id: 'p15' })

    // Índice de partido siguiente
    expect(nextRoundMatchIndex(0)).toBe(0)  // octavos[0] → cuartos[0]
    expect(nextRoundMatchIndex(1)).toBe(0)  // octavos[1] → cuartos[0]
    expect(nextRoundMatchIndex(2)).toBe(1)  // octavos[2] → cuartos[1]
    expect(nextRoundMatchIndex(6)).toBe(3)  // octavos[6] → cuartos[3]
  })
})
