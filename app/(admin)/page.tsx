export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { formatDate } from '@/lib/utils/format'
import { getActiveTournament, getPhases, getDashboardStats, getPendingMatches } from '@/lib/db/queries'
import { sql } from '@/lib/db'

export default async function DashboardPage() {
  const tournament = await getActiveTournament()

  if (!tournament) {
    return <NoTournamentView />
  }

  const [stats, pendingMatches, phases] = await Promise.all([
    getDashboardStats(tournament.id),
    getPendingMatches(tournament.id, 5),
    getPhases(tournament.id),
  ])

  // Eliminados recientes
  const recentEliminated = await sql`
    SELECT pq.*, p.full_name, p.short_name, ph.name as phase_name
    FROM phase_qualifications pq
    JOIN players p ON p.id = pq.player_id
    JOIN phases ph ON ph.id = pq.phase_id
    WHERE pq.tournament_id = ${tournament.id} AND pq.status = 'eliminado'
    ORDER BY pq.updated_at DESC
    LIMIT 5
  `

  const activePhase = phases.find((p: any) => p.status === 'activa')

  // Progreso del torneo
  const progressData = await sql`
    SELECT
      COUNT(*) FILTER (WHERE status = 'terminado') AS played,
      COUNT(*) AS total
    FROM matches
    WHERE tournament_id = ${tournament.id}
  `
  const played = Number(progressData[0]?.played ?? 0)
  const totalMatches = Number(progressData[0]?.total ?? 0)
  const progressPct = totalMatches > 0 ? Math.round((played / totalMatches) * 100) : 0

  const statusLabels: Record<string, string> = {
    configuracion: 'En configuración',
    en_curso: 'En curso',
    finalizado: 'Finalizado',
  }
  const statusColors: Record<string, string> = {
    configuracion: 'badge-blue',
    en_curso: 'badge-green',
    finalizado: 'badge-gray',
  }

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold text-gold-400">🏠 El Corral</h1>
          <p className="text-felt-300 text-sm mt-0.5">{tournament.name}</p>
        </div>
        <span className={statusColors[tournament.status] ?? 'badge-gray'}>
          {statusLabels[tournament.status] ?? tournament.status}
        </span>
      </div>

      {/* Barra de progreso */}
      {totalMatches > 0 && (
        <div className="card space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-ivory-300 font-medium">Progreso del torneo</span>
            <span className="text-gold-400 font-bold">{progressPct}%</span>
          </div>
          <div className="w-full bg-felt-800 rounded-full h-3 overflow-hidden">
            <div
              className="h-3 rounded-full bg-gradient-to-r from-felt-500 to-gold-400 transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-felt-400">
            <span>{played} partidos jugados</span>
            <span>{totalMatches - played} pendientes</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Jugadores" value={stats.playerCount} icon="👥" />
        <StatCard label="Partidos jugados" value={stats.matchCount} icon="🎱" />
        <StatCard label="Fase actual" value={activePhase?.name ?? '—'} icon="🐷" />
        <StatCard label="Inicio" value={formatDate(tournament.start_date)} icon="📅" />
      </div>

      <div>
        <h2 className="text-sm font-semibold text-ivory-400 uppercase tracking-wide mb-3">
          Accesos rápidos
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <QuickLink href="/jugadores/nuevo" icon="➕" label="Nuevo jugador" />
          <QuickLink href="/fases/nueva" icon="🎲" label="Nueva fase" />
          {activePhase && (
            <QuickLink href={`/fases/${activePhase.id}`} icon="🐷" label="Ver fase activa" />
          )}
          <QuickLink href="/marranometro" icon="📊" label="Marranómetro" />
          <QuickLink href="/eliminatorias" icon="🏆" label="Eliminatorias" />
          <QuickLink href="/imagenes" icon="📸" label="Crear tarjeta" />
        </div>
      </div>

      {pendingMatches.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-ivory-400 uppercase tracking-wide">
              Partidos pendientes
            </h2>
            <Link href="/fases" className="text-xs text-chalk-400 hover:text-chalk-300">
              Ver todos →
            </Link>
          </div>
          <div className="space-y-2">
            {pendingMatches.map((match: any) => (
              <Link
                key={match.id}
                href={`/partidos/${match.id}`}
                className="card flex items-center justify-between hover:border-gold-400 transition-colors"
              >
                <div className="text-sm">
                  <span className="text-ivory-200 font-medium">
                    {match.pa_short ?? match.pa_name}
                  </span>
                  <span className="text-felt-400 mx-2">vs</span>
                  <span className="text-ivory-200 font-medium">
                    {match.pb_short ?? match.pb_name}
                  </span>
                </div>
                <span className="text-gold-400 text-sm">›</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {recentEliminated.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-ivory-400 uppercase tracking-wide mb-3">
            🐷 Marranos de la ronda recientes
          </h2>
          <div className="card space-y-2">
            {recentEliminated.map((q: any) => (
              <div key={q.id} className="flex items-center justify-between">
                <span className="text-sm text-ivory-200">
                  {q.short_name ?? q.full_name}
                </span>
                <span className="text-felt-400 text-xs">{q.phase_name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card bg-carbon-900/50">
        <h2 className="text-sm font-semibold text-ivory-400 uppercase tracking-wide mb-3">
          Configuración del torneo
        </h2>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div><span className="text-felt-400">Sets para ganar:</span>
            <span className="text-ivory-200 ml-2">{tournament.sets_to_win}</span></div>
          <div><span className="text-felt-400">Entradas máx./set:</span>
            <span className="text-ivory-200 ml-2">{tournament.max_entries_per_set}</span></div>
          <div><span className="text-felt-400">3er puesto:</span>
            <span className="text-ivory-200 ml-2">
              {tournament.has_third_place_match ? 'Sí' : 'No'}
            </span></div>
          <div><span className="text-felt-400">Vista pública:</span>
            <span className="text-ivory-200 ml-2">
              {tournament.public_link_enabled ? '✓ Activa' : 'Desactivada'}
            </span></div>
        </div>
        <Link href="/torneo" className="btn-secondary btn-sm mt-4 inline-flex">
          ⚙️ Editar configuración
        </Link>
      </div>
    </div>
  )
}

function StatCard({ label, value, icon }: { label: string; value: string | number; icon: string }) {
  return (
    <div className="card text-center">
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-xl font-bold text-gold-400">{value}</div>
      <div className="text-xs text-felt-300 mt-0.5">{label}</div>
    </div>
  )
}

function QuickLink({ href, icon, label }: { href: string; icon: string; label: string }) {
  return (
    <Link href={href} className="card flex items-center gap-3 hover:border-gold-400 transition-colors">
      <span className="text-xl">{icon}</span>
      <span className="text-sm text-ivory-200 font-medium">{label}</span>
    </Link>
  )
}

function NoTournamentView() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 fade-in">
      <div className="text-center">
        <div className="text-6xl mb-4">🐷</div>
        <h1 className="text-3xl font-display font-bold text-gold-400">¡El corral está vacío!</h1>
        <p className="text-felt-300 mt-2">No hay ningún torneo activo. Crea uno para empezar.</p>
      </div>
      <Link href="/torneo" className="btn-primary btn-lg">➕ Crear torneo</Link>
    </div>
  )
}
