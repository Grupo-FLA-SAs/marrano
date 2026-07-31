export const dynamic = 'force-dynamic'
export const revalidate = 0

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { unstable_noStore as noStore } from 'next/cache'
import GroupCard from '@/components/fases/GroupCard'
import { getPhaseById } from '@/lib/db/queries'
import { sql } from '@/lib/db'

export default async function FaseDetailPage({ params }: { params: { id: string } }) {
  noStore()
  const phase = await getPhaseById(params.id)
  if (!phase) return notFound()

  const groups = await sql`SELECT * FROM groups WHERE phase_id = ${params.id} ORDER BY group_number`
  const groupIds = groups.map((g: any) => g.id)

  let members: any[] = []
  let matches: any[] = []

  if (groupIds.length > 0) {
    members = await sql`
      SELECT gm.*, p.id as pid, p.full_name, p.short_name, p.handicap
      FROM group_members gm
      JOIN players p ON p.id = gm.player_id
      WHERE gm.group_id = ANY(${groupIds}::uuid[])
    `
    const rows = await sql`
      SELECT m.*,
        pa.id as pa_id, pa.full_name as pa_name, pa.short_name as pa_short, pa.handicap as pa_handicap,
        pb.id as pb_id, pb.full_name as pb_name, pb.short_name as pb_short, pb.handicap as pb_handicap,
        json_agg(ms.* ORDER BY ms.set_number) FILTER (WHERE ms.id IS NOT NULL) as sets
      FROM matches m
      JOIN players pa ON pa.id = m.player_a_id
      JOIN players pb ON pb.id = m.player_b_id
      LEFT JOIN match_sets ms ON ms.match_id = m.id
      WHERE m.group_id = ANY(${groupIds}::uuid[])
      GROUP BY m.id, pa.id, pa.full_name, pa.short_name, pa.handicap,
               pb.id, pb.full_name, pb.short_name, pb.handicap
      ORDER BY m.created_at
    `
    matches = rows.map((m: any) => ({
      ...m,
      sets: m.sets ?? [],
      player_a: { id: m.pa_id, full_name: m.pa_name, short_name: m.pa_short, handicap: m.pa_handicap },
      player_b: { id: m.pb_id, full_name: m.pb_name, short_name: m.pb_short, handicap: m.pb_handicap },
    }))

    // Reshape members
    members = members.map((m: any) => ({
      ...m,
      player: { id: m.pid, full_name: m.full_name, short_name: m.short_name, handicap: m.handicap },
    }))
  }

  const statusColors: Record<string, string> = {
    pendiente: 'badge-gray', activa: 'badge-green', finalizada: 'badge-gold',
  }

  return (
    <div className="space-y-5 fade-in">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <Link href="/fases" className="text-felt-400 text-xs hover:text-ivory-300">← La Marranera</Link>
          <h1 className="text-2xl font-display font-bold text-gold-400 mt-1">🐷 {phase.name}</h1>
          <p className="text-felt-300 text-sm">
            {phase.num_groups} grupos · {phase.qualifiers_per_group} clasificados por grupo
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={statusColors[phase.status] ?? 'badge-gray'}>{phase.status}</span>
          {phase.status === 'pendiente' && (
            <Link href={`/fases/${phase.id}/sorteo`} className="btn-primary btn-sm">🎲 Ir al sorteo</Link>
          )}
          {phase.status === 'activa' && (
            <Link href={`/fases/${phase.id}/cierre`} className="btn-secondary btn-sm">🔒 Cerrar fase</Link>
          )}
        </div>
      </div>

      {groups.length === 0 && (
        <div className="card text-center py-8">
          <p className="text-felt-400">No hay grupos. Haz el sorteo primero.</p>
          <Link href={`/fases/${params.id}/sorteo`} className="btn-primary mt-4 inline-flex">
            🎲 Ir al sorteo
          </Link>
        </div>
      )}

      {groups.map((group: any) => {
        const groupMembers = members.filter(m => m.group_id === group.id)
        const groupMatches = matches.filter(m => m.group_id === group.id)
        return (
          <GroupCard
            key={group.id}
            group={group}
            members={groupMembers}
            matches={groupMatches}
            qualifiersPerGroup={phase.qualifiers_per_group}
          />
        )
      })}
    </div>
  )
}
