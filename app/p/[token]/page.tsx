import { notFound } from 'next/navigation'
import { formatDate, knockoutRoundLabel } from '@/lib/utils/format'
import { rankPlayers } from '@/lib/business/ranking'
import { calcGroupStandings } from '@/lib/business/standings'
import { applyTiebreakers } from '@/lib/business/tiebreakers'
import { getTournamentByToken } from '@/lib/db/queries'
import { sql } from '@/lib/db'

export default async function PublicPage({ params }: { params: { token: string } }) {
  const tournament = await getTournamentByToken(params.token)
  if (!tournament) return notFound()

  const [phases, players, stats, seeds, knockoutMatches] = await Promise.all([
    sql`SELECT * FROM phases WHERE tournament_id = ${tournament.id} ORDER BY phase_number`,
    sql`SELECT * FROM players WHERE tournament_id = ${tournament.id}`,
    sql`SELECT * FROM historical_stats WHERE tournament_id = ${tournament.id}`,
    sql`
      SELECT ks.*, row_to_json(p) as player
      FROM knockout_seeds ks
      JOIN players p ON p.id = ks.player_id
      WHERE ks.tournament_id = ${tournament.id}
      ORDER BY ks.seed_number
    `,
    sql`
      SELECT m.*,
        row_to_json(pa) as player_a,
        row_to_json(pb) as player_b
      FROM matches m
      JOIN players pa ON pa.id = m.player_a_id
      JOIN players pb ON pb.id = m.player_b_id
      WHERE m.tournament_id = ${tournament.id}
        AND m.knockout_round IS NOT NULL
      ORDER BY m.created_at
    `,
  ])

  const statsMap = new Map(stats.map((s: any) => [s.player_id, s]))
  const ranked = rankPlayers(players as any, statsMap as any)

  const roundOrder = ['octavos', 'cuartos', 'semifinal', 'final', 'tercer_puesto']
  const knockoutByRound = roundOrder.reduce((acc, r) => {
    acc[r] = knockoutMatches.filter((m: any) => m.knockout_round === r)
    return acc
  }, {} as Record<string, any[]>)

  return (
    <div className="min-h-screen felt-bg text-ivory-300">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="text-5xl mb-3">🐷</div>
          <h1 className="text-3xl font-display font-bold text-gold-400">{tournament.name}</h1>
          <p className="text-felt-300 text-sm mt-1">
            {tournament.description ?? 'Torneo de Billar a Tres Bandas'}
          </p>
          <p className="text-felt-400 text-xs mt-1">{formatDate(tournament.start_date)}</p>
          <div className="inline-flex items-center gap-2 mt-2 px-3 py-1 rounded-full
                          bg-felt-700 border border-felt-600 text-xs text-felt-300">
            👁 Vista pública — solo lectura
          </div>
        </div>

        {/* Marranómetro (top 10) */}
        {ranked.length > 0 && (
          <section>
            <h2 className="text-lg font-bold text-gold-400 mb-3">📊 Marranómetro</h2>
            <div className="card overflow-x-auto">
              <table className="standings-table min-w-full">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Jugador</th>
                    <th className="text-center">PG%</th>
                    <th className="text-center">H%</th>
                  </tr>
                </thead>
                <tbody>
                  {ranked.slice(0, 10).map(r => (
                    <tr key={r.player.id}>
                      <td className="font-bold text-ivory-300">{r.position}</td>
                      <td className="text-ivory-200">{r.player.short_name ?? r.player.full_name}</td>
                      <td className="text-center">{(r.win_pct * 100).toFixed(0)}%</td>
                      <td className="text-center">
                        {r.avg_handicap_completion > 0
                          ? `${(r.avg_handicap_completion * 100).toFixed(0)}%`
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Sembrados */}
        {seeds.length > 0 && (
          <section>
            <h2 className="text-lg font-bold text-gold-400 mb-3">🎯 Sembrados a octavos</h2>
            <div className="grid grid-cols-2 gap-2">
              {seeds.map((s: any) => (
                <div key={s.seed_number} className="card flex items-center gap-3">
                  <span className="badge-gold">#{s.seed_number}</span>
                  <span className="text-ivory-200 text-sm">
                    {s.player?.short_name ?? s.player?.full_name}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Eliminatorias */}
        {roundOrder.map(round => {
          const roundMatches = knockoutByRound[round]
          if (!roundMatches || roundMatches.length === 0) return null
          return (
            <section key={round}>
              <h2 className="text-lg font-bold text-gold-400 mb-3">
                {knockoutRoundLabel(round)}
              </h2>
              <div className="space-y-2">
                {roundMatches.map((m: any) => (
                  <div key={m.id} className="card">
                    <div className={`text-sm ${m.winner_id === m.player_a_id ? 'text-gold-400 font-bold' : 'text-ivory-200'}`}>
                      {m.player_a?.short_name ?? m.player_a?.full_name}
                    </div>
                    {m.status === 'terminado' && (
                      <div className="text-center text-ivory-300 font-bold text-lg py-1">
                        {m.score_a}–{m.score_b}
                      </div>
                    )}
                    <div className={`text-sm ${m.winner_id === m.player_b_id ? 'text-gold-400 font-bold' : 'text-ivory-200'}`}>
                      {m.player_b?.short_name ?? m.player_b?.full_name}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )
        })}

        {/* Fases */}
        {phases.map((phase: any) => (
          <PublicPhase key={phase.id} phase={phase} />
        ))}

        <p className="text-center text-felt-500 text-xs pb-8">
          MARRANO — Torneo de Billar a Tres Bandas
        </p>
      </div>
    </div>
  )
}

async function PublicPhase({ phase }: { phase: any }) {
  const groups = await sql`
    SELECT * FROM groups WHERE phase_id = ${phase.id} ORDER BY group_number
  `
  if (!groups.length) return null

  const groupIds = groups.map((g: any) => g.id)

  const [members, matches] = await Promise.all([
    sql`
      SELECT gm.*, row_to_json(p) as player
      FROM group_members gm
      JOIN players p ON p.id = gm.player_id
      WHERE gm.group_id = ANY(${groupIds}::uuid[])
    `,
    sql`
      SELECT m.*, COALESCE(
        json_agg(ms ORDER BY ms.set_number) FILTER (WHERE ms.id IS NOT NULL), '[]'
      ) as sets
      FROM matches m
      LEFT JOIN match_sets ms ON ms.match_id = m.id
      WHERE m.group_id = ANY(${groupIds}::uuid[])
      GROUP BY m.id
    `,
  ])

  return (
    <section>
      <h2 className="text-lg font-bold text-gold-400 mb-3">{phase.name}</h2>
      <div className="space-y-4">
        {groups.map((group: any) => {
          const gMembers = members.filter((m: any) => m.group_id === group.id)
          const gMatches = matches.filter((m: any) => m.group_id === group.id)
          const players = gMembers.map((m: any) => m.player)
          const standings = calcGroupStandings(players, gMatches as any)
          const ranked = applyTiebreakers(standings, gMatches as any)

          return (
            <div key={group.id} className="card">
              <h3 className="font-bold text-gold-400 mb-2">{group.name}</h3>
              <table className="standings-table w-full text-xs">
                <thead>
                  <tr>
                    <th>#</th><th>Jugador</th>
                    <th className="text-center">PJ</th>
                    <th className="text-center">Pts</th>
                    <th className="text-center">SG</th>
                  </tr>
                </thead>
                <tbody>
                  {ranked.map(s => (
                    <tr key={s.player_id}>
                      <td className="font-bold">{s.position}</td>
                      <td>{s.player.short_name ?? s.player.full_name}</td>
                      <td className="text-center">{s.played}</td>
                      <td className="text-center font-bold text-gold-400">{s.points}</td>
                      <td className="text-center">{s.sets_won}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        })}
      </div>
    </section>
  )
}
