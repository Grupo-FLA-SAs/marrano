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
  const [showAllPending, setShowAllPending] = useState(false)
  // Abierto por defecto para que el marcador recién guardado se vea al instante
  const [showCompleted, setShowCompleted] = useState(true)
  const players = members.map(m => m.player)

  const rawStandings = calcGroupStandings(players, matches as any)
  const standings = applyTiebreakers(rawStandings, matches as any)

  const totalMatches = players.length * (players.length - 1) / 2
  const completedMatches = matches.filter(m => m.status === 'terminado')
  const desertedMatches = matches.filter(m => m.status === 'anulado')
  const pendingMatches = matches.filter(m =>
    m.status === 'pendiente' || m.status === 'programado' || m.status === 'en_juego'
  )

  return (
    <div className="card space-y-4">
      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-gold-400 text-lg">{group.name}</h3>
        <span className="text-xs text-felt-400">
          {completedMatches.length}/{totalMatches} partidos
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
            {standings.map((s) => {
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
                      {isLast && completedMatches.length === totalMatches && (
                        <span className="badge-red text-xs">🐷</span>
                      )}
                      {isQualified && completedMatches.length === totalMatches && (
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

      {/* Partidos jugados */}
      {completedMatches.length > 0 && (
        <div>
          <button
            onClick={() => setShowCompleted(v => !v)}
            className="flex items-center gap-2 text-xs font-semibold text-ivory-400 uppercase tracking-wide mb-2 hover:text-ivory-200 transition-colors"
          >
            <span>✅ Partidos jugados ({completedMatches.length})</span>
            <span>{showCompleted ? '▲' : '▼'}</span>
          </button>

          {showCompleted && (
            <div className="space-y-2">
              {completedMatches.map(m => {
                const pA = m.player_a as any
                const pB = m.player_b as any
                const sets = (m.sets ?? []) as any[]
                const isWinnerA = m.winner_id === m.player_a_id

                return (
                  <div key={m.id} className="bg-felt-800/60 rounded-lg px-3 py-2 space-y-1.5">
                    {/* Fila 1: nombres + marcador + editar */}
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className={cn('font-bold truncate flex-1 text-xs', isWinnerA ? 'text-gold-400' : 'text-ivory-500')}>
                        {isWinnerA && '👑 '}{pA?.short_name ?? pA?.full_name}
                      </span>
                      <span className="text-ivory-200 font-bold text-sm shrink-0">{m.score_a}–{m.score_b}</span>
                      <span className={cn('font-bold truncate flex-1 text-right text-xs', !isWinnerA ? 'text-gold-400' : 'text-ivory-500')}>
                        {pB?.short_name ?? pB?.full_name}{!isWinnerA && ' 👑'}
                      </span>
                      <Link href={`/partidos/${m.id}`} className="shrink-0 text-felt-500 hover:text-gold-400 transition-colors ml-1" title="Editar">✏️</Link>
                    </div>
                    {/* Fila 2: sets */}
                    {sets.length > 0 && (
                      <div className="flex gap-1.5">
                        {sets.map((s: any, idx: number) => {
                          const setWinnerA = s.winner_id === m.player_a_id
                          return (
                            <span key={idx} className="bg-felt-700 rounded-md px-2 py-1 font-mono text-xs flex-1 text-center">
                              <span className={setWinnerA ? 'text-gold-400 font-bold' : 'text-ivory-500'}>{s.player_a_carambolas}</span>
                              <span className="text-felt-500 mx-0.5">-</span>
                              <span className={!setWinnerA ? 'text-gold-400 font-bold' : 'text-ivory-500'}>{s.player_b_carambolas}</span>
                              {s.had_penalty && <span className="text-amber-400 ml-0.5">⚡</span>}
                            </span>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Partidos desiertos */}
      {desertedMatches.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
            🚫 No jugados ({desertedMatches.length})
          </p>
          <div className="space-y-1">
            {desertedMatches.map(m => (
              <div key={m.id} className="flex items-center justify-between bg-slate-800/30 rounded-lg px-3 py-2">
                <span className="text-slate-500 text-xs">
                  {(m.player_a as any)?.short_name ?? (m.player_a as any)?.full_name}
                  <span className="mx-1.5">vs</span>
                  {(m.player_b as any)?.short_name ?? (m.player_b as any)?.full_name}
                </span>
                <Link href={`/partidos/${m.id}`} className="text-slate-600 hover:text-slate-400 text-xs transition-colors">✏️</Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Partidos pendientes */}
      {pendingMatches.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-ivory-400 uppercase tracking-wide mb-2">
            Partidos pendientes
          </p>
          <div className="space-y-1">
            {(showAllPending ? pendingMatches : pendingMatches.slice(0, 4)).map(m => (
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
                onClick={() => setShowAllPending(v => !v)}
                className="w-full text-xs text-chalk-400 hover:text-chalk-300 text-center py-1 transition-colors"
              >
                {showAllPending ? '▲ Ver menos' : `+${pendingMatches.length - 4} más`}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
