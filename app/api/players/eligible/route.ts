import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getActiveTournament } from '@/lib/db/queries'

/**
 * Devuelve los jugadores elegibles para la próxima fase.
 * Si hay clasificados de la última fase finalizada → los retorna (con group_position).
 * Si no → todos los jugadores activos del torneo.
 */
export async function GET() {
  const tournament = await getActiveTournament()
  if (!tournament) return NextResponse.json({ error: 'Sin torneo activo' }, { status: 404 })

  const qualified = await sql`
    SELECT DISTINCT ON (pq.player_id)
      pq.player_id, pq.position_in_group as group_position,
      p.full_name, p.short_name, p.handicap, p.id
    FROM phase_qualifications pq
    JOIN players p ON p.id = pq.player_id
    JOIN phases ph ON ph.id = pq.phase_id
    WHERE pq.tournament_id = ${tournament.id}
      AND pq.status = 'clasificado'
      AND ph.status = 'finalizada'
    ORDER BY pq.player_id, ph.created_at DESC
  `

  if (qualified.length > 0) {
    return NextResponse.json({ data: qualified, source: 'classified', count: qualified.length })
  }

  const all = await sql`
    SELECT id, full_name, short_name, handicap, null as group_position
    FROM players
    WHERE tournament_id = ${tournament.id} AND status = 'activo'
    ORDER BY full_name
  `
  return NextResponse.json({ data: all, source: 'all', count: all.length })
}
