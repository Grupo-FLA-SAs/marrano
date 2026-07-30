'use client'

import { useState, useEffect } from 'react'
import { organizeBracket, isRoundComplete, KNOCKOUT_ROUNDS } from '@/lib/business/knockout'
import { knockoutRoundLabel } from '@/lib/utils/format'
import Link from 'next/link'

export default function EliminatoriasPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  async function load() {
    const res = await fetch('/api/knockout')
    const json = await res.json()
    setData(json.data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function generarSiembraYOctavos() {
    setGenerating(true)
    setMsg(null)
    const res = await fetch('/api/knockout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'generate_seeds' }),
    })
    const json = await res.json()
    if (!res.ok) { setMsg(json.error); setGenerating(false); return }
    await load()
    setGenerating(false)
  }

  async function generarSiguienteRonda(currentRound: string, nextRound: string) {
    setGenerating(true)
    await fetch('/api/knockout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'next_round', currentRound, nextRound }),
    })
    await load()
    setGenerating(false)
  }

  if (loading) return <div className="text-felt-400">Cargando…</div>
  if (!data) return <div className="text-felt-400">No hay torneo activo.</div>

  const { seeds, matches, players } = data
  const bracket = organizeBracket(matches)
  const hasSiembra = seeds.length === 16
  const playerMap = new Map(players.map((p: any) => [p.id, p]))
  const roundOrder: (typeof KNOCKOUT_ROUNDS[number])[] = ['octavos', 'cuartos', 'semifinal', 'final', 'tercer_puesto']

  return (
    <div className="space-y-6 fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold text-gold-400">🏆 Eliminatorias</h1>
        <p className="text-felt-300 text-sm">Cuadro de eliminación directa</p>
      </div>

      {!hasSiembra && (
        <div className="card">
          <h2 className="font-semibold text-ivory-200 mb-2">Siembra y octavos de final</h2>
          {msg && (
            <div className="bg-red-900/40 border border-red-700 rounded p-2 text-red-300 text-sm mb-3">
              {msg}
            </div>
          )}
          <button onClick={generarSiembraYOctavos} disabled={generating} className="btn-primary">
            {generating ? 'Generando…' : '🎯 Generar siembra y octavos'}
          </button>
        </div>
      )}

      {roundOrder.map(round => {
        const roundMatches = bracket[round] ?? []
        if (roundMatches.length === 0) return null

        const nextRoundMap: Record<string, string> = {
          octavos: 'cuartos', cuartos: 'semifinal', semifinal: 'final',
        }
        const nextRound = nextRoundMap[round]
        const thisComplete = isRoundComplete(roundMatches)
        const nextExists = nextRound && (bracket[nextRound as keyof typeof bracket]?.length ?? 0) > 0

        return (
          <div key={round} className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-gold-400 text-lg">{knockoutRoundLabel(round)}</h2>
              {thisComplete && nextRound && !nextExists && (
                <button onClick={() => generarSiguienteRonda(round, nextRound)}
                  disabled={generating} className="btn-primary btn-sm">
                  {generating ? '…' : `Generar ${knockoutRoundLabel(nextRound)} →`}
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {roundMatches.map((m: any) => {
                const pA = playerMap.get(m.player_a_id)
                const pB = playerMap.get(m.player_b_id)
                const seedA = seeds.find((s: any) => s.player_id === m.player_a_id)
                const seedB = seeds.find((s: any) => s.player_id === m.player_b_id)
                return (
                  <Link key={m.id} href={`/partidos/${m.id}`}
                    className="card hover:border-gold-400 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 space-y-1">
                        <div className={`flex items-center gap-2 ${m.winner_id === m.player_a_id ? 'text-gold-400 font-bold' : 'text-ivory-200'}`}>
                          {seedA && <span className="badge-gray text-xs">#{seedA.seed_number}</span>}
                          <span className="text-sm">{(pA as any)?.short_name ?? (pA as any)?.full_name ?? '?'}</span>
                        </div>
                        <div className={`flex items-center gap-2 ${m.winner_id === m.player_b_id ? 'text-gold-400 font-bold' : 'text-ivory-200'}`}>
                          {seedB && <span className="badge-gray text-xs">#{seedB.seed_number}</span>}
                          <span className="text-sm">{(pB as any)?.short_name ?? (pB as any)?.full_name ?? '?'}</span>
                        </div>
                      </div>
                      <div className="text-center">
                        {m.status === 'terminado'
                          ? <div className="font-bold text-ivory-200 text-lg">{m.score_a}–{m.score_b}</div>
                          : <span className="badge-gray text-xs">Pendiente</span>}
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )
      })}

      {(() => {
        const finalMatch = bracket['final']?.[0]
        if (finalMatch?.status === 'terminado' && finalMatch.winner_id) {
          const champion = playerMap.get(finalMatch.winner_id)
          return (
            <div className="card text-center bg-gold-400/10 border-gold-400">
              <div className="text-4xl mb-2">🏆</div>
              <h2 className="text-2xl font-display font-bold text-gold-400">Maestro de las Tres Bandas</h2>
              <p className="text-ivory-200 text-xl mt-2 font-bold">{(champion as any)?.full_name ?? '—'}</p>
            </div>
          )
        }
        return null
      })()}
    </div>
  )
}
