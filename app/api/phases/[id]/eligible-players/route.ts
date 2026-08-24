import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getPhaseById } from '@/lib/db/queries'

/**
 * Devuelve los jugadores elegibles para el sorteo de esta fase.
 * Si hay clasificados de una fase anterior del mismo torneo → los usa.
 * Si no → devuelve todos los jugadores activos del torneo.
 * Incluye group_position para identificar cabezas de grupo (position=1).
 */
export async function GET(_: Request, { params }: { params: { id: string } }) {
  const phase = await getPhaseById(params.id)
  if (!phase) return NextResponse.json({ error: 'No encontrada' }, { status: 404 })

  // Buscar clasificados de fases anteriores cerradas
  const qualified = await sql`
    SELECT pq.player_id, pq.position_in_group as group_position, pq.group_id,
           p.full_name, p.short_name, p.handicap, p.id,
           ph.name as phase_name, ph.phase_number
    FROM phase_qualifications pq
    JOIN players p ON p.id = pq.player_id
    JOIN phases ph ON ph.id = pq.phase_id
    WHERE pq.tournament_id = ${(phase as any).tournament_id}
      AND pq.status = 'clasificado'
      AND ph.status = 'finalizada'
    ORDER BY ph.phase_number DESC, pq.position_in_group ASC
  `

  if (qualified.length > 0) {
    return NextResponse.json({ data: qualified, source: 'classified' })
  }

  // Primera fase — usar todos los jugadores del torneo
  const all = await sql`
    SELECT id, full_name, short_name, handicap, null as group_position
    FROM players
    WHERE tournament_id = ${(phase as any).tournament_id}
    ORDER BY full_name
  `
  return NextResponse.json({ data: all, source: 'all' })
}
