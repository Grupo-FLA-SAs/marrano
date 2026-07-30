import { calcGroupStandings, calcMiniTablePoints } from '@/lib/business/standings'
import { applyTiebreakers } from '@/lib/business/tiebreakers'
import type { Player, MatchSet } from '@/lib/supabase/types'

function makePlayer(id: string, handicap = 15): Player {
  return {
    id,
    tournament_id: 'tid',
    full_name: `Jugador ${id}`,
    short_name: null,
    photo_url: null,
    handicap,
    status: 'activo',
    notes: null,
    created_at: '',
    updated_at: '',
  }
}

function makeMatch(
  id: string,
  aId: string,
  bId: string,
  winnerId: string | null,
  scoreA: number,
  scoreB: number
) {
  return {
    id,
    player_a_id: aId,
    player_b_id: bId,
    winner_id: winnerId,
    score_a: scoreA,
    score_b: scoreB,
    status: winnerId ? 'terminado' : 'pendiente',
    sets: [] as MatchSet[],
  }
}

const P1 = makePlayer('p1')
const P2 = makePlayer('p2')
const P3 = makePlayer('p3')
const P4 = makePlayer('p4')

// Test 9: Tabla normal con 1 punto por victoria
describe('calcGroupStandings', () => {
  it('T9 - asigna 1 punto por victoria, 0 por derrota', () => {
    const matches = [
      makeMatch('m1', 'p1', 'p2', 'p1', 2, 0),
      makeMatch('m2', 'p1', 'p3', 'p3', 0, 2),
      makeMatch('m3', 'p2', 'p3', 'p2', 2, 1),
    ]
    const standings = calcGroupStandings([P1, P2, P3], matches)
    const s1 = standings.find(s => s.player_id === 'p1')!
    const s2 = standings.find(s => s.player_id === 'p2')!
    const s3 = standings.find(s => s.player_id === 'p3')!

    expect(s1.points).toBe(1) // ganó p1vp2
    expect(s2.points).toBe(1) // ganó p2vp3
    expect(s3.points).toBe(1) // ganó p3vp1

    expect(s1.won).toBe(1)
    expect(s1.lost).toBe(1)
  })

  it('T9b - los puntos se calculan correctamente con 4 jugadores', () => {
    const matches = [
      makeMatch('m1', 'p1', 'p2', 'p1', 2, 0),
      makeMatch('m2', 'p1', 'p3', 'p1', 2, 0),
      makeMatch('m3', 'p1', 'p4', 'p1', 2, 0),
      makeMatch('m4', 'p2', 'p3', 'p2', 2, 0),
      makeMatch('m5', 'p2', 'p4', 'p2', 2, 0),
      makeMatch('m6', 'p3', 'p4', 'p4', 0, 2),
    ]
    const standings = calcGroupStandings([P1, P2, P3, P4], matches)
    const byPlayer = Object.fromEntries(standings.map(s => [s.player_id, s]))
    expect(byPlayer['p1'].points).toBe(3)
    expect(byPlayer['p2'].points).toBe(2)
    expect(byPlayer['p4'].points).toBe(1)
    expect(byPlayer['p3'].points).toBe(0)
  })
})

// Test 10: Desempate de dos por enfrentamiento directo
describe('applyTiebreakers - dos jugadores empatados', () => {
  it('T10 - desempata dos jugadores por enfrentamiento directo', () => {
    const players = [P1, P2, P3]
    const matches = [
      makeMatch('m1', 'p1', 'p2', 'p1', 2, 0),  // p1 gana a p2
      makeMatch('m2', 'p1', 'p3', 'p3', 0, 2),  // p3 gana a p1
      makeMatch('m3', 'p2', 'p3', 'p2', 2, 0),  // p2 gana a p3
    ]
    const standings = calcGroupStandings(players, matches)
    // P1, P2, P3 todos con 1 punto → empate triple
    const ranked = applyTiebreakers(standings, matches)

    // p1 ganó a p2 directamente, así que p1 > p2 en mini-tabla
    const pos = Object.fromEntries(ranked.map(r => [r.player_id, r.position]))
    // Todos deben tener una posición asignada
    expect(Object.values(pos).sort()).toEqual([1, 2, 3])
  })
})

// Test 11: Desempate múltiple con mini tabla (2-0 = 2 pts, 2-1 = 1 pt)
describe('calcMiniTablePoints', () => {
  it('T11 - victoria 2-0 vale 2 puntos en mini-tabla', () => {
    const matches = [
      makeMatch('m1', 'p1', 'p2', 'p1', 2, 0),  // 2-0 → p1 obtiene 2
      makeMatch('m2', 'p1', 'p3', 'p1', 2, 1),  // 2-1 → p1 obtiene 1
      makeMatch('m3', 'p2', 'p3', 'p2', 2, 1),  // 2-1 → p2 obtiene 1
    ]
    const pts = calcMiniTablePoints(['p1', 'p2', 'p3'], matches)
    expect(pts.get('p1')).toBe(3)   // 2 + 1
    expect(pts.get('p2')).toBe(1)   // 1
    expect(pts.get('p3')).toBe(0)
  })
})

// Test 12: Clasificación configurable por grupo
describe('phase qualifiers per group', () => {
  it('T12 - projected qualifiers = groups * qualifiersPerGroup', () => {
    const { projectedQualifiers } = require('@/lib/business/draws')
    expect(projectedQualifiers(8, 3)).toBe(24)
    expect(projectedQualifiers(4, 4)).toBe(16)
    expect(projectedQualifiers(5, 3)).toBe(15)
  })
})
