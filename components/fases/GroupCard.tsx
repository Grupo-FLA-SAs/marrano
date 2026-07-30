'use client'

import { useState } from 'react'
import Link from 'next/link'
import { calcGroupStandings } from '@/lib/business/standings'
import { applyTiebreakers, tiebreakReasonLabel } from '@/lib/business/tiebreakers'
import type { Group, GroupMember, Match, Player, MatchSet } from '@/lib/supabase/types'
import { cn } from '@/lib/utils/cn'

interface Props {
  group: Group
  members: (GroupMember & { player: Player })[]
  matches: (Match & { player_a: Player; player_b: Player; sets: MatchSet[] })[]
  qualifiersPerGroup: number
}

export default function GroupCard({ group, members, matches, qualifiersPerGroup }: Props) {
  const [showAll, setShowAll] = useState(false)
  const players = members.map(m => m.player)

  const rawStandings = calcGroupStandings(players, matches as any)
  const standings = applyTiebreakers(rawStandings, matches as any)

  const totalMatches = players.length * (players.length - 1) / 2
  const completedMatches = matches.filter(m => m.status === 'terminado').length
  const pendingMatches = matches.filter(m =>
    m.status === 'pendiente' || m.status === 'programado' || m.status === 'en_juego'
  )

  return (
    <div className="card space-y-4">
      {/* Encabezado del grupo */}
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-gold-400 text-lg">{group.name}</h3>
        <span className="text-xs text-felt-400">
          {completedMatches}/{totalMatches} partidos
        </span>
      </div>

      {/* Tabla de posiciones */}
      <div className="overflow-x-auto -mx-1">
        <table className="standings-table min-w-full">
          <thead>
            <tr>
              <th className="w-6">#</th>
              <th>Jugador</th>
              <th className="text-center w-8">PJ</th>
              <th className="text-center w-8">PG</th>
              <th className="text-center w-8">PP</th>
              <th className="text-center w-8">Pts</th>
              <th className="text-center w-8">SG</th>
              <th className="text-center w-8">SP</th>
              <th className="text-right w-12">H%</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((s, idx) => {
              const isQualified = s.position <= qualifiersPerGroup
              const isLast = s.position === standings.length
              return (
                <tr
                  key={s.player_id}
                  className={cn(
                    'transition-colors',
                    isQualified && 'bg-felt-600/20',
                    s.needs_manual_resolution && 'bg-gold-400/5'
                  )}
                >
                  <td className="text-center font-bold text-ivory-300">{s.position}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <span className="text-ivory-200 text-sm">
                        {s.player.short_name ?? s.player.full_name}
                      </span>
                      {isLast && completedMatches === totalMatches && (
                        <span className="badge-red text-xs">🐷</span>
                      )}
                      {isQualified && completedMatches === totalMatches && (
                        <span className="badge-green text-xs">✓</span>
                      )}
                    </div>
                    <div className="text-xs text-felt-400">
                      {tiebreakReasonLabel(s.tiebreak_reason)}
                      {s.needs_manual_resolution && (
                        <span className="text-gold-400 ml-1">⚠ pendiente</span>
                      )}
                    </div>
                  </td>
                  <td className="text-center text-ivory-300">{s.played}</td>
                  <td className="text-center text-ivory-300">{s.won}</td>
                  <td className="text-center text-ivory-300">{s.lost}</td>
                  <td className="text-center font-bold text-gold-400">{s.points}</td>
                  <td className="text-center text-ivory-300">{s.sets_won}</td>
                  <td className="text-center text-ivory-300">{s.sets_lost}</td>
                  <td className="text-right text-xs text-felt-300">
                    {s.total_handicap > 0
                      ? `${(s.avg_completion * 100).toFixed(0)}%`
                      : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Partidos pendientes */}
      {pendingMatches.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-ivory-400 uppercase tracking-wide mb-2">
            Partidos pendientes
          </p>
          <div className="space-y-1">
            {(showAll ? pendingMatches : pendingMatches.slice(0, 4)).map(m => (
              <Link
                key={m.id}
                href={`/partidos/${m.id}`}
                className="flex items-center justify-between bg-felt-800 hover:bg-felt-700
                           rounded-lg px-3 py-2 text-sm transition-colors"
              >
                <span className="text-ivory-200">
                  {(m.player_a as any)?.short_name ?? (m.player_a as any)?.full_name}
                  <span className="text-felt-400 mx-1.5">vs</span>
                  {(m.player_b as any)?.short_name ?? (m.player_b as any)?.full_name}
                </span>
                <span className="text-gold-400 text-xs">Registrar →</span>
              </Link>
            ))}
            {pendingMatches.length > 4 && (
              <button
                onClick={() => setShowAll(v => !v)}
                className="w-full text-xs text-chalk-400 hover:text-chalk-300 text-center py-1 transition-colors"
              >
                {showAll ? '▲ Ver menos' : `+${pendingMatches.length - 4} más`}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
