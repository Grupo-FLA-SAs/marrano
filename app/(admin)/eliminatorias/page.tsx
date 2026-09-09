'use client'

import { useState, useEffect } from 'react'
import { organizeBracket, isRoundComplete } from '@/lib/business/knockout'
import BracketView from '@/components/eliminatorias/BracketView'

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
    setMsg(null)
    try {
      const res = await fetch('/api/knockout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'advance_pairs', currentRound, nextRound }),
      })
      const json = await res.json()
      if (!res.ok) setMsg(json.error ?? 'Error al generar')
    } catch (e) {
      setMsg('Error de red al generar')
    }
    await load()
    setGenerating(false)
  }

  if (loading) return <div className="text-felt-400">Cargando…</div>
  if (!data) return <div className="text-felt-400">No hay torneo activo.</div>

  const { seeds, matches, players } = data
  const bracket = organizeBracket(matches)
  const hasSiembra = seeds.length === 16
  const playerMap = new Map<string, any>(players.map((p: any) => [p.id, p]))

  const octavosM   = bracket.octavos   ?? []
  const cuartosM   = bracket.cuartos   ?? []
  const semifinalM = bracket.semifinal ?? []
  const finalM     = bracket.final     ?? []

  // Detecta si hay partidos pendientes de generar para cualquier ronda
  function countAvailablePairs(current: any[], next: any[]): number {
    const sorted = [...current].sort((a, b) => a.created_at.localeCompare(b.created_at))
    const pairs = Math.floor(sorted.length / 2)
    let available = 0
    for (let i = 0; i < pairs; i++) {
      const mA = sorted[i * 2]
      const mB = sorted[i * 2 + 1]
      if (!mA?.winner_id || !mB?.winner_id) continue
      const exists = next.some((nm: any) =>
        (nm.player_a_id === mA.winner_id && nm.player_b_id === mB.winner_id) ||
        (nm.player_a_id === mB.winner_id && nm.player_b_id === mA.winner_id)
      )
      if (!exists) available++
    }
    return available
  }

  let pendingCurrentRound = ''
  let pendingNextRound    = ''

  if (octavosM.length > 0 && countAvailablePairs(octavosM, cuartosM) > 0) {
    pendingCurrentRound = 'octavos'; pendingNextRound = 'cuartos'
  } else if (cuartosM.length > 0 && countAvailablePairs(cuartosM, semifinalM) > 0) {
    pendingCurrentRound = 'cuartos'; pendingNextRound = 'semifinal'
  } else if (semifinalM.length > 0 && countAvailablePairs(semifinalM, finalM) > 0) {
    pendingCurrentRound = 'semifinal'; pendingNextRound = 'final'
  }

  const hasPendingNext = pendingCurrentRound !== ''

  // Campeón
  const finalMatch = bracket['final']?.[0]
  const isChampion = finalMatch?.status === 'terminado' && finalMatch.winner_id
  const champion = isChampion ? playerMap.get(finalMatch.winner_id!) : null

  const roundLabel: Record<string, string> = {
    octavos: 'Octavos de final',
    cuartos: 'Cuartos de final',
    semifinal: 'Semifinales',
    final: 'Final',
  }

  return (
    <div className="space-y-6 fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold text-gold-400">🏆 Eliminatorias</h1>
        <p className="text-felt-300 text-sm">Cuadro de eliminación directa</p>
      </div>

      {/* Acción: generar siembra */}
      {!hasSiembra ? (
        <div className="card">
          <h2 className="font-semibold text-ivory-200 mb-2">Siembra y octavos de final</h2>
          {msg ? (
            <div className="bg-red-900/40 border border-red-700 rounded p-2 text-red-300 text-sm mb-3">
              {msg}
            </div>
          ) : null}
          <button onClick={generarSiembraYOctavos} disabled={generating} className="btn-primary">
            {generating ? 'Generando…' : '🎯 Generar siembra y octavos'}
          </button>
        </div>
      ) : null}

      {/* Acción: avanzar ronda */}
      {hasPendingNext ? (
        <div className="card flex items-center justify-between gap-4">
          <p className="text-ivory-200 text-sm">
            Hay cruces de {roundLabel[pendingCurrentRound] ?? pendingCurrentRound} listos — generar {roundLabel[pendingNextRound] ?? pendingNextRound} disponibles
          </p>
          <button
            onClick={() => generarSiguienteRonda(pendingCurrentRound, pendingNextRound)}
            disabled={generating}
            className="btn-primary btn-sm shrink-0"
          >
            {generating ? '…' : `Generar ${roundLabel[pendingNextRound] ?? pendingNextRound} →`}
          </button>
        </div>
      ) : null}

      {/* Cuadro visual */}
      {hasSiembra ? (
        <div className="card p-4">
          <BracketView bracket={bracket} seeds={seeds} playerMap={playerMap} />
        </div>
      ) : null}

      {/* Campeón */}
      {champion ? (
        <div className="card text-center bg-gold-400/10 border-gold-400">
          <div className="text-4xl mb-2">🏆</div>
          <h2 className="text-2xl font-display font-bold text-gold-400">Maestro de las Tres Bandas</h2>
          <p className="text-ivory-200 text-xl mt-2 font-bold">{(champion as any)?.full_name ?? '—'}</p>
        </div>
      ) : null}
    </div>
  )
}
