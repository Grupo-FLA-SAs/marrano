// ============================================================
// MARRANO — Sorteo de grupos
// ============================================================

/**
 * Distribuye jugadores aleatoriamente en numGroups grupos.
 * Retorna un array de arrays (grupos), cada uno con player_ids.
 * Si allowUneven=false, todos los grupos tendrán el mismo tamaño
 * y se requerirá que el total sea divisible.
 */
export function drawGroups(
  playerIds: string[],
  numGroups: number,
  allowUneven = true
): string[][] {
  if (numGroups <= 0 || playerIds.length === 0) return []

  // Mezcla aleatoria (Fisher-Yates)
  const shuffled = [...playerIds]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }

  const groups: string[][] = Array.from({ length: numGroups }, () => [])

  // Distribuir round-robin
  shuffled.forEach((id, idx) => {
    groups[idx % numGroups].push(id)
  })

  return groups
}

/**
 * Calcula la distribución de tamaños de grupos dado n jugadores y g grupos.
 */
export function groupSizeDistribution(n: number, g: number): { min: number; max: number; uneven: boolean } {
  const base = Math.floor(n / g)
  const remainder = n % g
  return {
    min: base,
    max: remainder > 0 ? base + 1 : base,
    uneven: remainder > 0,
  }
}

/**
 * Proyecta el número de clasificados que produciría una fase.
 */
export function projectedQualifiers(
  numGroups: number,
  qualifiersPerGroup: number
): number {
  return numGroups * qualifiersPerGroup
}

/**
 * Mueve un jugador de un grupo a otro (para ajuste manual).
 * Retorna los grupos actualizados sin mutar los originales.
 */
export function movePlayer(
  groups: string[][],
  playerId: string,
  fromGroupIndex: number,
  toGroupIndex: number
): string[][] {
  const updated = groups.map(g => [...g])

  // Quitar del grupo origen
  const fromIdx = updated[fromGroupIndex].indexOf(playerId)
  if (fromIdx === -1) throw new Error(`Jugador ${playerId} no encontrado en grupo ${fromGroupIndex}`)
  updated[fromGroupIndex].splice(fromIdx, 1)

  // Agregar al grupo destino
  updated[toGroupIndex].push(playerId)

  return updated
}

/**
 * Genera un nombre de grupo: A, B, C, ... Z, AA, AB, ...
 */
export function groupName(index: number): string {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  if (index < 26) return letters[index]
  return letters[Math.floor(index / 26) - 1] + letters[index % 26]
}
