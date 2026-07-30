import {
  calcSetResult,
  calcMatchWinner,
  canAddSet,
  generateRoundRobinPairs,
  expectedMatchCount,
} from '@/lib/business/matches'

const A = 'player-a'
const B = 'player-b'

function makeSet(overrides: Partial<Parameters<typeof calcSetResult>[0]> = {}): Parameters<typeof calcSetResult>[0] {
  return {
    playerACarambolas: 0,
    playerBCarambolas: 0,
    playerAEntries: 15,
    playerBEntries: 15,
    playerAHandicap: 15,
    playerBHandicap: 20,
    winnerId: A,
    playerAId: A,
    playerBId: B,
    hadPenalty: false,
    penaltyWinnerId: null,
    ...overrides,
  }
}

// Test 1: Generación de partidos todos contra todos
describe('generateRoundRobinPairs', () => {
  it('T1 - genera n*(n-1)/2 pares para n jugadores', () => {
    const players = ['p1', 'p2', 'p3', 'p4']
    const pairs = generateRoundRobinPairs(players)
    expect(pairs).toHaveLength(6)
    expect(expectedMatchCount(4)).toBe(6)
    // No hay pares repetidos ni auto-enfrentamientos
    for (const [a, b] of pairs) {
      expect(a).not.toBe(b)
    }
    const uniquePairs = new Set(pairs.map(([a, b]) => [a, b].sort().join('-')))
    expect(uniquePairs.size).toBe(6)
  })
})

// Test 2: Partido ganado 2-0
describe('calcMatchWinner - 2-0', () => {
  it('T2 - gana 2-0 correctamente', () => {
    const sets = [{ setNumber: 1, winnerId: A }, { setNumber: 2, winnerId: A }]
    const result = calcMatchWinner(sets, A, B)
    expect(result.winnerId).toBe(A)
    expect(result.scoreA).toBe(2)
    expect(result.scoreB).toBe(0)
    expect(result.isComplete).toBe(true)
  })
})

// Test 3: Partido ganado 2-1
describe('calcMatchWinner - 2-1', () => {
  it('T3 - gana 2-1 correctamente', () => {
    const sets = [
      { setNumber: 1, winnerId: A },
      { setNumber: 2, winnerId: B },
      { setNumber: 3, winnerId: A },
    ]
    const result = calcMatchWinner(sets, A, B)
    expect(result.winnerId).toBe(A)
    expect(result.scoreA).toBe(2)
    expect(result.scoreB).toBe(1)
    expect(result.isComplete).toBe(true)
  })
})

// Test 4: Bloqueo de tercer set innecesario
describe('canAddSet', () => {
  it('T4 - no permite agregar set cuando alguien ya ganó 2', () => {
    const sets = [{ setNumber: 1, winnerId: A }, { setNumber: 2, winnerId: A }]
    expect(canAddSet(sets, A, B)).toBe(false)
  })

  it('T4b - permite agregar set cuando nadie ha ganado aún', () => {
    const sets = [{ setNumber: 1, winnerId: A }, { setNumber: 2, winnerId: B }]
    expect(canAddSet(sets, A, B)).toBe(true)
  })
})

// Test 5: Ganador por alcanzar el hándicap
describe('calcSetResult - ganador por hándicap', () => {
  it('T5 - A alcanza su hándicap → A gana', () => {
    const result = calcSetResult(makeSet({
      playerACarambolas: 15,
      playerBCarambolas: 12,
      playerAHandicap: 15,
      playerBHandicap: 20,
      winnerId: A,
    }))
    expect(result.winByHandicapA).toBe(true)
    expect(result.winByHandicapB).toBe(false)
    expect(result.expectedWinnerId).toBe(A)
    expect(result.needsPenalty).toBe(false)
  })
})

// Test 6: Ganador por menor distancia al hándicap
describe('calcSetResult - distancia', () => {
  it('T6 - A está más cerca → A gana', () => {
    // A: 12/15 = distancia 3. B: 15/20 = distancia 5
    const result = calcSetResult(makeSet({
      playerACarambolas: 12,
      playerBCarambolas: 15,
      playerAHandicap: 15,
      playerBHandicap: 20,
      playerAEntries: 30,
      playerBEntries: 30,
      winnerId: A,
    }))
    expect(result.distanceA).toBe(3)
    expect(result.distanceB).toBe(5)
    expect(result.expectedWinnerId).toBe(A)
    expect(result.needsPenalty).toBe(false)
  })
})

// Test 7: Empate 14/15 contra 19/20 — distancias iguales
describe('calcSetResult - empate de distancias', () => {
  it('T7 - distancias iguales requieren penaltis', () => {
    // A: 14/15, distancia = 1. B: 19/20, distancia = 1
    const result = calcSetResult(makeSet({
      playerACarambolas: 14,
      playerBCarambolas: 19,
      playerAHandicap: 15,
      playerBHandicap: 20,
      playerAEntries: 30,
      playerBEntries: 30,
      winnerId: A,
      hadPenalty: true,
      penaltyWinnerId: A,
    }))
    expect(result.distanceA).toBe(1)
    expect(result.distanceB).toBe(1)
    expect(result.needsPenalty).toBe(true)
  })
})

// Test 8: Obligación de penaltis cuando las distancias son iguales
describe('calcSetResult - advertencia de penaltis faltantes', () => {
  it('T8 - advierte si hay empate y no se marcaron penaltis', () => {
    const result = calcSetResult(makeSet({
      playerACarambolas: 14,
      playerBCarambolas: 19,
      playerAHandicap: 15,
      playerBHandicap: 20,
      playerAEntries: 30,
      playerBEntries: 30,
      winnerId: A,
      hadPenalty: false,  // ← error
    }))
    expect(result.needsPenalty).toBe(true)
    expect(result.warnings.some(w => w.includes('penaltis'))).toBe(true)
  })
})
