// ============================================================
// MARRANO — Lógica de partidos y validación de sets
// Todas las funciones son puras (sin efectos secundarios)
// ============================================================

export interface SetInput {
  playerACarambolas: number
  playerBCarambolas: number
  playerAEntries: number
  playerBEntries: number
  playerAHandicap: number
  playerBHandicap: number
  winnerId: string
  playerAId: string
  playerBId: string
  hadPenalty: boolean
  penaltyWinnerId: string | null
}

export interface SetResult {
  expectedWinnerId: string | null
  distanceA: number
  distanceB: number
  needsPenalty: boolean
  winByHandicapA: boolean   // A alcanzó su hándicap
  winByHandicapB: boolean
  isValid: boolean
  warnings: string[]
}

/**
 * Calcula el resultado esperado de un set dado los datos registrados.
 * Devuelve el ganador esperado, si necesita penaltis, y advertencias.
 */
export function calcSetResult(set: SetInput): SetResult {
  const warnings: string[] = []

  const {
    playerACarambolas, playerBCarambolas,
    playerAEntries, playerBEntries,
    playerAHandicap, playerBHandicap,
    playerAId, playerBId,
  } = set

  // ¿Alguno alcanzó o superó su hándicap?
  const winByHandicapA = playerACarambolas >= playerAHandicap
  const winByHandicapB = playerBCarambolas >= playerBHandicap

  let expectedWinnerId: string | null = null
  let needsPenalty = false

  if (winByHandicapA && winByHandicapB) {
    // Ambos alcanzaron — gana quien lo alcanzó "primero"
    // No podemos saberlo por los datos capturados; tratamos como empate
    needsPenalty = true
    warnings.push('Ambos jugadores alcanzaron su hándicap. Se requiere definición por penaltis.')
  } else if (winByHandicapA) {
    expectedWinnerId = playerAId
  } else if (winByHandicapB) {
    expectedWinnerId = playerBId
  } else {
    // Ninguno alcanzó el hándicap — comparar distancias
    const distanceA = playerAHandicap - playerACarambolas
    const distanceB = playerBHandicap - playerBCarambolas

    if (distanceA < distanceB) {
      expectedWinnerId = playerAId
    } else if (distanceB < distanceA) {
      expectedWinnerId = playerBId
    } else {
      // Distancias iguales — penaltis
      needsPenalty = true
      expectedWinnerId = null
      warnings.push(
        `Empate por distancia (A: ${distanceA}, B: ${distanceB}). Se requiere definición por penaltis.`
      )
    }
  }

  const distanceA = Math.max(0, playerAHandicap - playerACarambolas)
  const distanceB = Math.max(0, playerBHandicap - playerBCarambolas)

  // Validar que el ganador registrado coincida con el esperado
  if (!needsPenalty && expectedWinnerId && set.winnerId !== expectedWinnerId) {
    warnings.push(
      `El ganador registrado no coincide con el resultado calculado. ` +
      `Según los datos, debería ganar el jugador con menor distancia al hándicap.`
    )
  }

  if (needsPenalty && !set.hadPenalty) {
    warnings.push('El set requiere definición por penaltis pero no se marcó el campo correspondiente.')
  }

  if (needsPenalty && set.hadPenalty && !set.penaltyWinnerId) {
    warnings.push('Se marcaron penaltis pero no se registró el ganador de los penaltis.')
  }

  // Validaciones de rango
  const isValid =
    playerACarambolas >= 0 &&
    playerBCarambolas >= 0 &&
    playerAEntries >= 1 && playerAEntries <= 50 &&
    playerBEntries >= 1 && playerBEntries <= 50 &&
    playerAHandicap > 0 &&
    playerBHandicap > 0

  return {
    expectedWinnerId: needsPenalty ? (set.penaltyWinnerId ?? null) : expectedWinnerId,
    distanceA,
    distanceB,
    needsPenalty,
    winByHandicapA,
    winByHandicapB,
    isValid,
    warnings,
  }
}

export interface MatchSetSummary {
  setNumber: number
  winnerId: string
}

/**
 * Determina el ganador del partido dado los sets jugados.
 * Devuelve null si el partido no ha terminado.
 */
export function calcMatchWinner(
  sets: MatchSetSummary[],
  playerAId: string,
  playerBId: string,
  setsToWin = 2
): { winnerId: string | null; scoreA: number; scoreB: number; isComplete: boolean } {
  let scoreA = 0
  let scoreB = 0

  for (const set of sets) {
    if (set.winnerId === playerAId) scoreA++
    else if (set.winnerId === playerBId) scoreB++
  }

  const winnerId =
    scoreA >= setsToWin ? playerAId :
    scoreB >= setsToWin ? playerBId :
    null

  const isComplete = winnerId !== null

  return { winnerId, scoreA, scoreB, isComplete }
}

/**
 * Verifica si se puede registrar un set adicional.
 * Retorna false si alguien ya ganó el partido.
 */
export function canAddSet(
  existingSets: MatchSetSummary[],
  playerAId: string,
  playerBId: string,
  setsToWin = 2
): boolean {
  const { isComplete } = calcMatchWinner(existingSets, playerAId, playerBId, setsToWin)
  return !isComplete
}

/**
 * Genera todos los partidos todos-contra-todos de un grupo.
 * Retorna pares [playerA_id, playerB_id] sin repetición.
 */
export function generateRoundRobinPairs(playerIds: string[]): [string, string][] {
  const pairs: [string, string][] = []
  for (let i = 0; i < playerIds.length; i++) {
    for (let j = i + 1; j < playerIds.length; j++) {
      pairs.push([playerIds[i], playerIds[j]])
    }
  }
  return pairs
}

/**
 * Total de partidos esperados en un grupo de n jugadores.
 */
export function expectedMatchCount(n: number): number {
  return (n * (n - 1)) / 2
}
