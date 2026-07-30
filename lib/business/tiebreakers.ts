// ============================================================
// MARRANO — Lógica de desempates
// ============================================================

import { type Player } from '@/lib/supabase/types'
import {
  type PlayerStanding,
  type MatchForStanding,
  matchesBetween,
  calcMiniTablePoints,
} from './standings'

export type TiebreakReason =
  | 'puntos'
  | 'enfrentamiento_directo'
  | 'mini_tabla'
  | 'penaltis'
  | 'manual'
  | 'pendiente'

export interface RankedStanding extends PlayerStanding {
  position: number
  tiebreak_reason: TiebreakReason
  needs_manual_resolution: boolean
}

/**
 * Aplica desempates y devuelve la tabla ordenada con posición y motivo.
 *
 * Reglas:
 *  1. Si empatan exactamente 2 jugadores → enfrentamiento directo.
 *  2. Si empatan 3+ → mini-tabla (2pts por 2-0, 1pt por 2-1).
 *     a. Si un jugador despeja → se coloca primero, los demás repiten proceso.
 *     b. Si todos siguen igualados → 'pendiente' (requiere penaltis externos).
 */
export function applyTiebreakers(
  standings: PlayerStanding[],
  matches: MatchForStanding[],
  manualOverrides?: Map<string, number> // player_id → posición asignada manualmente
): RankedStanding[] {
  // Agrupar por puntos
  const groups = groupByPoints(standings)
  const result: RankedStanding[] = []
  let currentPos = 1

  for (const group of groups) {
    if (group.length === 1) {
      result.push({ ...group[0], position: currentPos, tiebreak_reason: 'puntos', needs_manual_resolution: false })
      currentPos++
      continue
    }

    // Hay empate — aplicar desempates
    const resolved = resolveGroup(group, matches, currentPos, manualOverrides)
    result.push(...resolved)
    currentPos += group.length
  }

  return result
}

function groupByPoints(standings: PlayerStanding[]): PlayerStanding[][] {
  const sorted = [...standings].sort((a, b) => b.points - a.points)
  const groups: PlayerStanding[][] = []
  let current: PlayerStanding[] = []

  for (const s of sorted) {
    if (current.length === 0 || current[0].points === s.points) {
      current.push(s)
    } else {
      groups.push(current)
      current = [s]
    }
  }
  if (current.length > 0) groups.push(current)
  return groups
}

function resolveGroup(
  group: PlayerStanding[],
  matches: MatchForStanding[],
  startPos: number,
  manualOverrides?: Map<string, number>
): RankedStanding[] {
  const ids = group.map(s => s.player_id)

  // Verificar override manual para todos
  if (manualOverrides) {
    const allHaveOverride = ids.every(id => manualOverrides.has(id))
    if (allHaveOverride) {
      return group
        .map(s => ({
          ...s,
          position: manualOverrides.get(s.player_id)!,
          tiebreak_reason: 'manual' as TiebreakReason,
          needs_manual_resolution: false,
        }))
        .sort((a, b) => a.position - b.position)
    }
  }

  if (group.length === 2) {
    return resolvePair(group, matches, startPos, manualOverrides)
  }

  return resolveMultiple(group, matches, startPos, manualOverrides)
}

function resolvePair(
  pair: PlayerStanding[],
  matches: MatchForStanding[],
  startPos: number,
  manualOverrides?: Map<string, number>
): RankedStanding[] {
  const [a, b] = pair
  const h2h = matchesBetween([a.player_id, b.player_id], matches)
    .filter(m => m.status === 'terminado')

  if (h2h.length > 0) {
    const lastMatch = h2h[h2h.length - 1]
    if (lastMatch.winner_id === a.player_id) {
      return [
        { ...a, position: startPos, tiebreak_reason: 'enfrentamiento_directo', needs_manual_resolution: false },
        { ...b, position: startPos + 1, tiebreak_reason: 'enfrentamiento_directo', needs_manual_resolution: false },
      ]
    } else if (lastMatch.winner_id === b.player_id) {
      return [
        { ...b, position: startPos, tiebreak_reason: 'enfrentamiento_directo', needs_manual_resolution: false },
        { ...a, position: startPos + 1, tiebreak_reason: 'enfrentamiento_directo', needs_manual_resolution: false },
      ]
    }
  }

  // Sin enfrentamiento directo o sin ganador → pendiente
  if (manualOverrides?.has(a.player_id) && manualOverrides?.has(b.player_id)) {
    const posA = manualOverrides.get(a.player_id)!
    const posB = manualOverrides.get(b.player_id)!
    return [
      { ...a, position: posA, tiebreak_reason: 'penaltis', needs_manual_resolution: false },
      { ...b, position: posB, tiebreak_reason: 'penaltis', needs_manual_resolution: false },
    ].sort((x, y) => x.position - y.position)
  }

  return [
    { ...a, position: startPos, tiebreak_reason: 'pendiente', needs_manual_resolution: true },
    { ...b, position: startPos + 1, tiebreak_reason: 'pendiente', needs_manual_resolution: true },
  ]
}

function resolveMultiple(
  group: PlayerStanding[],
  matches: MatchForStanding[],
  startPos: number,
  manualOverrides?: Map<string, number>
): RankedStanding[] {
  const ids = group.map(s => s.player_id)
  const miniPts = calcMiniTablePoints(ids, matches)

  // Agrupar por puntos de mini-tabla
  const sorted = [...group].sort(
    (a, b) => (miniPts.get(b.player_id) ?? 0) - (miniPts.get(a.player_id) ?? 0)
  )

  // ¿Hay alguno que despejó?
  const firstPts = miniPts.get(sorted[0].player_id) ?? 0
  const secondPts = miniPts.get(sorted[1].player_id) ?? 0

  if (firstPts > secondPts) {
    // El primero despejó — colocarlo y recursión con el resto
    const winner = sorted[0]
    const rest = sorted.slice(1)
    const restResolved = resolveGroup(rest, matches, startPos + 1, manualOverrides)
    return [
      { ...winner, position: startPos, tiebreak_reason: 'mini_tabla', needs_manual_resolution: false },
      ...restResolved,
    ]
  }

  // Todos igualados en mini-tabla → pendiente
  if (manualOverrides) {
    const allHaveOverride = ids.every(id => manualOverrides.has(id))
    if (allHaveOverride) {
      return group
        .map(s => ({
          ...s,
          position: manualOverrides.get(s.player_id)!,
          tiebreak_reason: 'penaltis' as TiebreakReason,
          needs_manual_resolution: false,
        }))
        .sort((a, b) => a.position - b.position)
    }
  }

  return group.map((s, i) => ({
    ...s,
    position: startPos + i,
    tiebreak_reason: 'pendiente' as TiebreakReason,
    needs_manual_resolution: true,
  }))
}

export function tiebreakReasonLabel(reason: TiebreakReason): string {
  const labels: Record<TiebreakReason, string> = {
    puntos: 'Por puntos',
    enfrentamiento_directo: 'Enfrentamiento directo',
    mini_tabla: 'Mini-tabla de desempate',
    penaltis: 'Definición por penaltis',
    manual: 'Ajuste manual autorizado',
    pendiente: 'Pendiente de resolución',
  }
  return labels[reason]
}
