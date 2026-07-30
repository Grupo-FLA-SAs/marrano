// ============================================================
// MARRANO — Tabla de posiciones de grupo
// ============================================================

import { type Player, type Match, type MatchSet } from '@/lib/supabase/types'

export interface MatchForStanding {
  id: string
  player_a_id: string
  player_b_id: string
  winner_id: string | null
  score_a: number
  score_b: number
  status: string
  sets: MatchSet[]
}

export interface PlayerStanding {
  player_id: string
  player: Player
  played: number
  won: number
  lost: number
  points: number          // 1 por victoria, 0 por derrota
  sets_won: number
  sets_lost: number
  set_diff: number
  carambolas: number
  total_handicap: number  // suma de hándicaps de todos los sets jugados
  avg_completion: number  // carambolas / total_handicap
  avg_entries: number
}

/**
 * Calcula la tabla de posiciones de un grupo (sin desempates).
 * El orden devuelto es por puntos descendente únicamente.
 */
export function calcGroupStandings(
  players: Player[],
  matches: MatchForStanding[]
): PlayerStanding[] {
  const map = new Map<string, PlayerStanding>()

  for (const p of players) {
    map.set(p.id, {
      player_id: p.id,
      player: p,
      played: 0, won: 0, lost: 0, points: 0,
      sets_won: 0, sets_lost: 0, set_diff: 0,
      carambolas: 0, total_handicap: 0, avg_completion: 0, avg_entries: 0,
    })
  }

  const finished = matches.filter(m => m.status === 'terminado' && m.winner_id)

  for (const match of finished) {
    const a = map.get(match.player_a_id)
    const b = map.get(match.player_b_id)
    if (!a || !b) continue

    a.played++
    b.played++

    if (match.winner_id === match.player_a_id) {
      a.won++; a.points++; b.lost++
    } else {
      b.won++; b.points++; a.lost++
    }

    a.sets_won += match.score_a
    a.sets_lost += match.score_b
    b.sets_won += match.score_b
    b.sets_lost += match.score_a

    // Acumular carambolas, hándicap y entradas de los sets
    for (const set of match.sets ?? []) {
      const isA = set.winner_id === match.player_a_id || set.player_a_carambolas !== undefined

      // Para jugador A
      if (map.has(match.player_a_id)) {
        const entry = map.get(match.player_a_id)!
        entry.carambolas += set.player_a_carambolas
        entry.total_handicap += set.player_a_handicap
        entry.avg_entries += set.player_a_entries
      }
      // Para jugador B
      if (map.has(match.player_b_id)) {
        const entry = map.get(match.player_b_id)!
        entry.carambolas += set.player_b_carambolas
        entry.total_handicap += set.player_b_handicap
        entry.avg_entries += set.player_b_entries
      }

      void isA // silenciar warning
    }
  }

  // Calcular promedios
  for (const s of map.values()) {
    s.set_diff = s.sets_won - s.sets_lost
    s.avg_completion = s.total_handicap > 0 ? s.carambolas / s.total_handicap : 0
    const totalSets = s.sets_won + s.sets_lost
    s.avg_entries = totalSets > 0 ? s.avg_entries / totalSets : 0
  }

  return Array.from(map.values()).sort((a, b) => b.points - a.points)
}

/**
 * Extrae los partidos disputados entre un subconjunto de jugadores.
 */
export function matchesBetween(
  playerIds: string[],
  matches: MatchForStanding[]
): MatchForStanding[] {
  const set = new Set(playerIds)
  return matches.filter(
    m => set.has(m.player_a_id) && set.has(m.player_b_id) && m.status === 'terminado'
  )
}

/**
 * Mini-tabla de desempate múltiple.
 * Victoria 2–0: 2 puntos. Victoria 2–1: 1 punto. Derrota: 0 puntos.
 */
export function calcMiniTablePoints(
  playerIds: string[],
  matches: MatchForStanding[]
): Map<string, number> {
  const pts = new Map<string, number>(playerIds.map(id => [id, 0]))
  const relevant = matchesBetween(playerIds, matches)

  for (const m of relevant) {
    if (!m.winner_id) continue
    const loserId = m.winner_id === m.player_a_id ? m.player_b_id : m.player_a_id
    const winnerSets = m.winner_id === m.player_a_id ? m.score_a : m.score_b
    const loserSets = m.winner_id === m.player_a_id ? m.score_b : m.score_a

    if (pts.has(m.winner_id)) {
      // 2-0 → 2 pts, 2-1 → 1 pt
      const bonus = (winnerSets === 2 && loserSets === 0) ? 2 : 1
      pts.set(m.winner_id, (pts.get(m.winner_id) ?? 0) + bonus)
    }
    void loserId
  }

  return pts
}
