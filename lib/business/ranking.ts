// ============================================================
// MARRANO — Ranking histórico (Marranómetro)
// ============================================================

import { type HistoricalStats, type Player } from '@/lib/supabase/types'

export interface RankedPlayer {
  player: Player
  stats: HistoricalStats
  win_pct: number
  avg_sets_won_per_match: number
  avg_set_diff_per_match: number
  avg_handicap_completion: number   // carambolas / total_handicap (promedio por set)
  avg_entries_won_sets: number
  position: number
  seed_position: number | null
  current_status: 'activo' | 'clasificado' | 'eliminado' | 'retirado'
}

/**
 * Ordena jugadores por ranking histórico promedio.
 *
 * Criterios (en orden):
 * 1. Mayor porcentaje de partidos ganados.
 * 2. Mayor promedio de sets ganados por partido.
 * 3. Mayor diferencia promedio de sets por partido.
 * 4. Mayor cumplimiento promedio del hándicap por set.
 * 5. Menor promedio de entradas en sets ganados.
 * 6. Aleatorio estable (por player_id — determinístico).
 */
export function rankPlayers(
  players: Player[],
  statsMap: Map<string, HistoricalStats>,
  statusMap?: Map<string, 'activo' | 'clasificado' | 'eliminado' | 'retirado'>
): RankedPlayer[] {
  const computed = players.map(player => {
    const stats = statsMap.get(player.id) ?? emptyStats(player.id, player.tournament_id ?? '')

    const win_pct = stats.matches_played > 0
      ? stats.matches_won / stats.matches_played : 0

    const avg_sets_won_per_match = stats.matches_played > 0
      ? stats.sets_won / stats.matches_played : 0

    const total_set_diff = stats.sets_won - stats.sets_lost
    const avg_set_diff_per_match = stats.matches_played > 0
      ? total_set_diff / stats.matches_played : 0

    const avg_handicap_completion = stats.total_handicap_available > 0
      ? stats.total_carambolas / stats.total_handicap_available : 0

    const avg_entries_won_sets = stats.sets_won > 0
      ? stats.entries_in_won_sets / stats.sets_won : Infinity

    return {
      player,
      stats,
      win_pct,
      avg_sets_won_per_match,
      avg_set_diff_per_match,
      avg_handicap_completion,
      avg_entries_won_sets,
      position: 0,
      seed_position: null,
      current_status: (statusMap?.get(player.id) ?? 'activo') as RankedPlayer['current_status'],
    }
  })

  // Ordenar
  computed.sort((a, b) => {
    if (b.win_pct !== a.win_pct) return b.win_pct - a.win_pct
    if (b.avg_sets_won_per_match !== a.avg_sets_won_per_match)
      return b.avg_sets_won_per_match - a.avg_sets_won_per_match
    if (b.avg_set_diff_per_match !== a.avg_set_diff_per_match)
      return b.avg_set_diff_per_match - a.avg_set_diff_per_match
    if (b.avg_handicap_completion !== a.avg_handicap_completion)
      return b.avg_handicap_completion - a.avg_handicap_completion
    if (a.avg_entries_won_sets !== b.avg_entries_won_sets)
      return a.avg_entries_won_sets - b.avg_entries_won_sets
    // Desempate estable por ID
    return a.player.id.localeCompare(b.player.id)
  })

  // Asignar posiciones
  computed.forEach((r, i) => { r.position = i + 1 })

  return computed
}

/**
 * Asigna siembra (1-16) únicamente entre los clasificados a octavos.
 * El clasificado con mejor posición histórica ENTRE LOS 16 obtiene siembra 1.
 */
export function assignSeeds(
  allRanked: RankedPlayer[],
  qualifiedPlayerIds: string[]
): RankedPlayer[] {
  const qualifiedSet = new Set(qualifiedPlayerIds)
  const qualified = allRanked.filter(r => qualifiedSet.has(r.player.id))

  // Ya están ordenados por ranking histórico — asignar siembra secuencialmente
  qualified.forEach((r, i) => { r.seed_position = i + 1 })

  return allRanked
}

/**
 * Genera los cruces de octavos: 1 vs 16, 2 vs 15, ..., 8 vs 9
 */
export function generateOctavosCruces(
  seeds: Array<{ seed_number: number; player_id: string }>
): Array<{ seed_a: number; seed_b: number; player_a_id: string; player_b_id: string }> {
  const sorted = [...seeds].sort((a, b) => a.seed_number - b.seed_number)
  const cruces = []

  for (let i = 0; i < 8; i++) {
    const seedA = sorted[i]
    const seedB = sorted[15 - i]
    if (!seedA || !seedB) continue
    cruces.push({
      seed_a: seedA.seed_number,
      seed_b: seedB.seed_number,
      player_a_id: seedA.player_id,
      player_b_id: seedB.player_id,
    })
  }

  return cruces
}

function emptyStats(playerId: string, tournamentId: string): HistoricalStats {
  return {
    id: '',
    tournament_id: tournamentId,
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
    updated_at: new Date().toISOString(),
  }
}
