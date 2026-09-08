// ============================================================
// MARRANO — Cuadro eliminatorio
// ============================================================

import { type Match, type KnockoutRound } from '@/lib/supabase/types'
import { type KnockoutSeed } from '@/lib/supabase/types'

export const KNOCKOUT_ROUNDS: KnockoutRound[] = ['octavos', 'cuartos', 'semifinal', 'final']

/**
 * Dado un seed number (1-16), devuelve el seed del rival en octavos.
 * Cruce: 1v16, 2v15, 3v14, ..., 8v9
 */
export function getOctavosOpponent(seed: number): number {
  return 17 - seed
}

/**
 * Genera todos los cruces de octavos ordenados (1v16 primero).
 */
export function generateOctavosCruces(
  seeds: KnockoutSeed[]
): Array<{ player_a_id: string; player_b_id: string; seed_a: number; seed_b: number }> {
  const sorted = [...seeds].sort((a, b) => a.seed_number - b.seed_number)
  const s = (n: number) => sorted[n - 1] // 1-indexed helper

  // Orden del cuadro: 1 y 2 quedan en lados opuestos → solo se pueden ver en la final
  // Lado izquierdo (índices 0-3): cuartos pares en 0-1
  //   0: 1v16 → cuartos[0]
  //   1: 8v9  → cuartos[0]
  //   2: 4v13 → cuartos[1]
  //   3: 5v12 → cuartos[1]
  // Lado derecho (índices 4-7): cuartos pares en 2-3
  //   4: 2v15 → cuartos[2]
  //   5: 7v10 → cuartos[2]
  //   6: 3v14 → cuartos[3]
  //   7: 6v11 → cuartos[3]
  const order: [number, number][] = [
    [1, 16], [8, 9],
    [4, 13], [5, 12],
    [2, 15], [7, 10],
    [3, 14], [6, 11],
  ]

  return order
    .filter(([a, b]) => s(a) && s(b))
    .map(([a, b]) => ({
      player_a_id: s(a).player_id,
      player_b_id: s(b).player_id,
      seed_a: a,
      seed_b: b,
    }))
}

/**
 * Devuelve el índice del partido de cuartos al que avanza
 * el ganador de un partido de octavos dado su índice (0-7).
 *
 * Llave del cuadro estilo:
 *  Octavos: 0(1v16) 1(2v15) 2(3v14) 3(4v13) 4(5v12) 5(6v11) 6(7v10) 7(8v9)
 *  Cuartos: 0(G0vG1) 1(G2vG3) 2(G4vG5) 3(G6vG7)
 *  Semi: 0(G0vG1) 1(G2vG3)
 *  Final: 0
 */
export function nextRoundMatchIndex(currentIndex: number): number {
  return Math.floor(currentIndex / 2)
}

/**
 * Organiza partidos por ronda para renderizar el cuadro.
 */
export function organizeBracket(matches: Match[]): Record<KnockoutRound, Match[]> {
  const bracket: Record<KnockoutRound, Match[]> = {
    octavos: [],
    cuartos: [],
    semifinal: [],
    final: [],
    tercer_puesto: [],
  }

  for (const m of matches) {
    if (m.knockout_round && bracket[m.knockout_round] !== undefined) {
      bracket[m.knockout_round].push(m)
    }
  }

  // Ordenar por posición en el bracket (usando id como proxy estable si no hay order)
  for (const round of Object.keys(bracket) as KnockoutRound[]) {
    bracket[round].sort((a, b) => a.created_at.localeCompare(b.created_at))
  }

  return bracket
}

/**
 * Verifica si todos los partidos de una ronda están terminados.
 */
export function isRoundComplete(matches: Match[]): boolean {
  return matches.length > 0 && matches.every(m => m.status === 'terminado' || m.status === 'anulado')
}

/**
 * Extrae los ganadores de una ronda (para generar la siguiente).
 */
export function getRoundWinners(matches: Match[]): string[] {
  return matches
    .filter(m => m.winner_id !== null)
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .map(m => m.winner_id!)
}

/**
 * Genera los partidos de la siguiente ronda dado los ganadores de la ronda actual.
 * Los ganadores deben estar ordenados en el orden del bracket.
 *
 * winners[0] vs winners[1], winners[2] vs winners[3], ...
 */
export function generateNextRoundPairs(
  winners: string[]
): Array<{ player_a_id: string; player_b_id: string }> {
  const pairs = []
  for (let i = 0; i < winners.length; i += 2) {
    if (winners[i] && winners[i + 1]) {
      pairs.push({ player_a_id: winners[i], player_b_id: winners[i + 1] })
    }
  }
  return pairs
}

export function knockoutRoundFromMatchCount(matchCount: number): KnockoutRound | null {
  const map: Record<number, KnockoutRound> = {
    8: 'octavos',
    4: 'cuartos',
    2: 'semifinal',
    1: 'final',
  }
  return map[matchCount] ?? null
}
