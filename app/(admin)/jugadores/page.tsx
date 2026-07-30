export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { getActiveTournament, getPlayers } from '@/lib/db/queries'

export default async function JugadoresPage() {
  const tournament = await getActiveTournament()

  if (!tournament) {
    return (
      <div className="text-center py-12">
        <p className="text-felt-400">Primero crea un torneo en ⚙️ Configuración.</p>
      </div>
    )
  }

  const players = await getPlayers(tournament.id)
  const active = players.filter((p: any) => p.status !== 'retirado')
  const retired = players.filter((p: any) => p.status === 'retirado')

  return (
    <div className="space-y-5 fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-display font-bold text-gold-400">👥 Jugadores</h1>
        <div className="flex gap-2">
          <Link href="/jugadores/importar" className="btn-secondary btn-sm">📄 Importar CSV</Link>
          <Link href="/jugadores/nuevo" className="btn-primary">➕ Nuevo jugador</Link>
        </div>
      </div>

      {active.length === 0 && (
        <div className="card text-center py-8">
          <p className="text-felt-400">No hay jugadores activos aún.</p>
          <Link href="/jugadores/nuevo" className="btn-primary mt-4 inline-flex">
            ➕ Agregar primer jugador
          </Link>
        </div>
      )}

      {active.length > 0 && (
        <div>
          <p className="text-xs text-felt-400 mb-3">{active.length} jugadores activos</p>
          <div className="space-y-2">
            {active.map((player: any) => <PlayerCard key={player.id} player={player} />)}
          </div>
        </div>
      )}

      {retired.length > 0 && (
        <details className="card">
          <summary className="text-sm font-medium text-felt-400 cursor-pointer">
            Retirados ({retired.length})
          </summary>
          <div className="space-y-2 mt-3">
            {retired.map((player: any) => <PlayerCard key={player.id} player={player} />)}
          </div>
        </details>
      )}
    </div>
  )
}

function PlayerCard({ player }: { player: any }) {
  return (
    <Link
      href={`/jugadores/${player.id}`}
      className="card flex items-center gap-3 hover:border-gold-400 transition-colors"
    >
      <div className="w-10 h-10 rounded-full bg-felt-600 border border-felt-500
                      flex items-center justify-center text-ivory-300 font-bold text-sm flex-shrink-0">
        {player.full_name.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-ivory-200 font-medium text-sm truncate">
          {player.full_name}
          {player.short_name && (
            <span className="text-felt-400 font-normal ml-1">({player.short_name})</span>
          )}
        </p>
        {player.notes && <p className="text-felt-400 text-xs truncate">{player.notes}</p>}
      </div>
      <div className="text-right flex-shrink-0">
        <div className="text-gold-400 font-bold">{player.handicap}</div>
        <div className="text-felt-400 text-xs">hándicap</div>
      </div>
    </Link>
  )
}
