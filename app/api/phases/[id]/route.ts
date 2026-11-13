import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { sql } from '@/lib/db'
import {
  getPhaseById, getGroupsByPhase, getMatchesByPhase,
  updatePhaseStatus, upsertQualification, getActiveTournament,
} from '@/lib/db/queries'

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const phase = await getPhaseById(params.id)
  if (!phase) return NextResponse.json({ error: 'No encontrada' }, { status: 404 })

  const groups = await getGroupsByPhase(params.id)
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
      SELECT m.*, json_agg(ms.* ORDER BY ms.set_number) FILTER (WHERE ms.id IS NOT NULL) as sets
      FROM matches m
      LEFT JOIN match_sets ms ON ms.match_id = m.id
      WHERE m.group_id = ANY(${groupIds}::uuid[])
      GROUP BY m.id
    `
    matches = rows.map((r: any) => ({ ...r, sets: r.sets ?? [] }))
  }

  return NextResponse.json({ data: { phase, groups, members, matches } })
}

// Confirmar sorteo
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json()

  if (body.action === 'confirm_draw') {
    try {
    const { groups } = body // [{ name, players: [id, ...] }]
    const phase = await getPhaseById(params.id)
    if (!phase) return NextResponse.json({ error: 'No encontrada' }, { status: 404 })

    // Limpiar datos previos si existían (retry seguro)
    await sql`DELETE FROM matches WHERE phase_id = ${params.id}`
    await sql`DELETE FROM group_members WHERE phase_id = ${params.id}`
    await sql`DELETE FROM groups WHERE phase_id = ${params.id}`

    for (let i = 0; i < groups.length; i++) {
      const g = groups[i]
      const [group] = await sql`
        INSERT INTO groups (phase_id, tournament_id, name, group_number)
        VALUES (${params.id}, ${phase.tournament_id}, ${g.name}, ${i + 1})
        RETURNING *
      `
      // Insertar miembros
      for (const playerId of g.players) {
        await sql`
          INSERT INTO group_members (group_id, phase_id, tournament_id, player_id)
          VALUES (${group.id}, ${params.id}, ${phase.tournament_id}, ${playerId})
          ON CONFLICT DO NOTHING
        `
      }
      // Generar partidos round-robin
      const players = g.players
      for (let a = 0; a < players.length; a++) {
        for (let b = a + 1; b < players.length; b++) {
          await sql`
            INSERT INTO matches (tournament_id, phase_id, group_id, player_a_id, player_b_id, status, score_a, score_b)
            VALUES (${phase.tournament_id}, ${params.id}, ${group.id}, ${players[a]}, ${players[b]}, 'pendiente', 0, 0)
          `
        }
      }
    }
    await updatePhaseStatus(params.id, 'activa')
    return NextResponse.json({ ok: true })
    } catch (e: any) {
      console.error('confirm_draw error:', e)
      return NextResponse.json({ error: e.message ?? 'Error al confirmar sorteo' }, { status: 500 })
    }
  }

  if (body.action === 'close_phase') {
    try {
      const { qualifications } = body
      for (const q of qualifications) {
        await upsertQualification(q)
      }
      await updatePhaseStatus(params.id, 'finalizada')
      return NextResponse.json({ ok: true })
    } catch (e: any) {
      console.error('close_phase error:', e)
      return NextResponse.json({ error: e.message ?? 'Error al cerrar fase' }, { status: 500 })
    }
  }

  return NextResponse.json({ error: 'Acción desconocida' }, { status: 400 })
}
