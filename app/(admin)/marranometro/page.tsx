export const dynamic = 'force-dynamic'

import { getActiveTournament, getPlayers, getHistoricalStats, getQualifiedPlayers, getKnockoutSeeds } from '@/lib/db/queries'
import { rankPlayers, assignSeeds } from '@/lib/business/ranking'
import MarranometroTable, { type MarranometroRow } from '@/components/marranometro/MarranometroTable'

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

  const rows: MarranometroRow[] = ranked.map(r => ({
    player_id: r.player.id,
    full_name: r.player.full_name,
    short_name: r.player.short_name ?? null,
    handicap: r.player.handicap,
    matches_played: r.stats.matches_played,
    win_pct: r.win_pct,
    avg_sets_won_per_match: r.avg_sets_won_per_match,
    avg_set_diff_per_match: r.avg_set_diff_per_match,
    avg_handicap_completion: r.avg_handicap_completion,
    avg_entries_won_sets: r.avg_entries_won_sets === Infinity ? 9999 : r.avg_entries_won_sets,
    sets_won: r.stats.sets_won,
    sets_lost: r.stats.sets_lost,
    seed_position: r.seed_position ?? (seedMap.has(r.player.id) ? seedMap.get(r.player.id)! : null),
  }))

  return (
    <div className="space-y-5 fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold text-gold-400">📊 Marranómetro</h1>
        <p className="text-felt-300 text-sm mt-0.5">
          Ranking histórico por rendimiento. Toca las cabeceras para ordenar.
        </p>
      </div>

      <details className="card text-sm">
        <summary className="font-semibold text-ivory-300 cursor-pointer">
          ¿Cómo se calcula el ranking?
        </summary>
        <div className="mt-3 space-y-3 text-felt-300">
          <p>Los jugadores se ordenan por estos criterios en cascada (si hay empate en el primero, se aplica el siguiente):</p>
          <ol className="space-y-2 list-decimal list-inside">
            <li>
              <span className="text-ivory-200 font-semibold">PG% — % Partidos ganados</span>
              <br />
              <code className="text-gold-400 text-xs ml-4">PG% = Partidos ganados ÷ Partidos jugados</code>
            </li>
            <li>
              <span className="text-ivory-200 font-semibold">SG/P — Sets ganados por partido</span>
              <br />
              <code className="text-gold-400 text-xs ml-4">SG/P = Sets ganados ÷ Partidos jugados</code>
            </li>
            <li>
              <span className="text-ivory-200 font-semibold">ΔS/P — Diferencia de sets por partido</span>
              <br />
              <code className="text-gold-400 text-xs ml-4">ΔS/P = (Sets ganados − Sets perdidos) ÷ Partidos jugados</code>
            </li>
            <li>
              <span className="text-ivory-200 font-semibold">H% — Cumplimiento de hándicap</span>
              <br />
              <code className="text-gold-400 text-xs ml-4">H% = Carambolas totales ÷ Hándicap total disponible</code>
              <br />
              <span className="text-felt-400 text-xs ml-4">Qué tan cerca estuvo el jugador de alcanzar su hándicap en cada set.</span>
            </li>
            <li>
              <span className="text-ivory-200 font-semibold">Ent. — Entradas en sets ganados <span className="text-felt-400">(↓ menor = mejor)</span></span>
              <br />
              <code className="text-gold-400 text-xs ml-4">Ent. = Entradas usadas en sets ganados ÷ Sets ganados</code>
              <br />
              <span className="text-felt-400 text-xs ml-4">Eficiencia: gana en menos entradas = mejor.</span>
            </li>
            <li>
              <span className="text-felt-400">Desempate final por ID de jugador (determinístico).</span>
            </li>
          </ol>
        </div>
      </details>

      {rows.length === 0 ? (
        <div className="card text-center py-8">
          <p className="text-felt-400">Aún no hay partidos registrados.</p>
        </div>
      ) : (
        <MarranometroTable rows={rows} />
      )}

      <p className="text-xs text-felt-400 text-center">
        La siembra aplica únicamente entre los 16 clasificados a octavos de final.
      </p>
    </div>
  )
}
