export const dynamic = 'force-dynamic'

import { getActiveTournament, getPlayers, getHistoricalStats, getQualifiedPlayers, getKnockoutSeeds } from '@/lib/db/queries'
import { rankPlayers, assignSeeds } from '@/lib/business/ranking'

export default async function MarranometroPage() {
  const tournament = await getActiveTournament()
  if (!tournament) return <div className="text-felt-400">No hay torneo activo.</div>

  const [players, stats, qualifications, seeds] = await Promise.all([
    getPlayers(tournament.id),
    getHistoricalStats(tournament.id),
    getQualifiedPlayers(tournament.id),
    getKnockoutSeeds(tournament.id),
  ])

  const statsMap = new Map((stats as any[]).map((s: any) => [s.player_id, s]))
  const qualifiedIds = (qualifications as any[]).map((q: any) => q.player_id)
  const seedMap = new Map((seeds as any[]).map((s: any) => [s.player_id, s.seed_number]))

  let ranked = rankPlayers(players as any, statsMap as any)
  if (qualifiedIds.length > 0) ranked = assignSeeds(ranked, qualifiedIds)

  return (
    <div className="space-y-5 fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold text-gold-400">📊 Marranómetro</h1>
        <p className="text-felt-300 text-sm mt-0.5">
          Ranking histórico por rendimiento promedio.
        </p>
      </div>

      <details className="card">
        <summary className="text-sm font-semibold text-ivory-300 cursor-pointer">
          ¿Cómo se calcula el ranking?
        </summary>
        <ol className="mt-3 space-y-1 text-sm text-felt-300 list-decimal list-inside">
          <li>Mayor porcentaje de partidos ganados</li>
          <li>Mayor promedio de sets ganados por partido</li>
          <li>Mayor diferencia promedio de sets por partido</li>
          <li>Mayor cumplimiento promedio del hándicap por set</li>
          <li>Menor promedio de entradas en sets ganados</li>
          <li>Desempate estable por ID</li>
        </ol>
      </details>

      {ranked.length === 0 ? (
        <div className="card text-center py-8">
          <p className="text-felt-400">Aún no hay partidos registrados.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="standings-table min-w-full">
            <thead>
              <tr>
                <th className="w-8">#</th>
                <th>Jugador</th>
                <th className="text-center w-10">PJ</th>
                <th className="text-center w-10">PG%</th>
                <th className="text-center w-10">SG/P</th>
                <th className="text-center w-10">H%</th>
                <th className="text-right w-14">Siembra</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map(r => (
                <tr key={r.player.id}>
                  <td className="text-center font-bold text-ivory-300">{r.position}</td>
                  <td>
                    <div className="text-sm text-ivory-200 font-medium">
                      {r.player.short_name ?? r.player.full_name}
                    </div>
                    <div className="text-xs text-felt-400">H: {r.player.handicap}</div>
                  </td>
                  <td className="text-center text-ivory-300">{r.stats.matches_played}</td>
                  <td className="text-center text-ivory-300">{(r.win_pct * 100).toFixed(0)}%</td>
                  <td className="text-center text-ivory-300">{r.avg_sets_won_per_match.toFixed(2)}</td>
                  <td className="text-center text-ivory-300">
                    {r.avg_handicap_completion > 0
                      ? `${(r.avg_handicap_completion * 100).toFixed(0)}%` : '—'}
                  </td>
                  <td className="text-right">
                    {r.seed_position !== null ? (
                      <span className="badge-gold">#{r.seed_position}</span>
                    ) : seedMap.has(r.player.id) ? (
                      <span className="badge-gold">#{seedMap.get(r.player.id)}</span>
                    ) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-felt-400 text-center">
        La siembra aplica únicamente entre los 16 clasificados a octavos de final.
      </p>
    </div>
  )
}
