export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { getActiveTournament, getPhases } from '@/lib/db/queries'

const statusColors: Record<string, string> = {
  pendiente: 'badge-gray', activa: 'badge-green', finalizada: 'badge-gold',
}
const statusLabels: Record<string, string> = {
  pendiente: 'Pendiente', activa: 'Activa', finalizada: 'Finalizada',
}

export default async function FasesPage() {
  const tournament = await getActiveTournament()
  if (!tournament) {
    return <div className="text-center py-12"><p className="text-felt-400">Primero crea un torneo.</p></div>
  }

  const phases = await getPhases(tournament.id)

  return (
    <div className="space-y-5 fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-display font-bold text-gold-400">🐷 La Marranera</h1>
        <Link href="/fases/nueva" className="btn-primary">➕ Nueva fase</Link>
      </div>

      {phases.length === 0 && (
        <div className="card text-center py-8">
          <p className="text-felt-400 mb-4">No hay fases creadas aún.</p>
          <Link href="/fases/nueva" className="btn-primary inline-flex">➕ Crear primera fase</Link>
        </div>
      )}

      <div className="space-y-3">
        {phases.map((phase: any) => (
          <Link key={phase.id} href={`/fases/${phase.id}`}
            className="card flex items-center gap-4 hover:border-gold-400 transition-colors">
            <div className="w-8 h-8 rounded-full bg-gold-400 text-carbon-900 flex items-center justify-center font-bold text-sm flex-shrink-0">
              {phase.phase_number}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-ivory-200 font-medium">{phase.name}</p>
              <p className="text-felt-400 text-xs">
                {phase.num_groups} grupos · {phase.qualifiers_per_group} clasificados por grupo
              </p>
            </div>
            <span className={statusColors[phase.status] ?? 'badge-gray'}>
              {statusLabels[phase.status] ?? phase.status}
            </span>
            <span className="text-gold-400">›</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
