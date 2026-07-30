import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getActiveTournament, getPhases, createPhase } from '@/lib/db/queries'

export async function GET() {
  const tournament = await getActiveTournament()
  if (!tournament) return NextResponse.json({ data: [] })
  const phases = await getPhases(tournament.id)
  return NextResponse.json({ data: phases })
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const tournament = await getActiveTournament()
  if (!tournament) return NextResponse.json({ error: 'No hay torneo activo' }, { status: 400 })

  const body = await req.json()
  // Calcular phase_number
  const phases = await getPhases(tournament.id)
  const phaseNumber = phases.length + 1

  try {
    const phase = await createPhase({
      ...body,
      tournament_id: tournament.id,
      phase_number: phaseNumber,
      name: body.name ?? `Fase ${phaseNumber}`,
    })
    return NextResponse.json({ data: phase })
  } catch (e: any) {
    console.error('POST /api/phases error:', e)
    return NextResponse.json({ error: e.message ?? 'Error al crear fase' }, { status: 500 })
  }
}
