'use client'

import { useState, useEffect } from 'react'
import { organizeBracket } from '@/lib/business/knockout'
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

  // Calcula los pares disponibles desde los datos que ya tiene el frontend
  function getAvailablePairs(
    current: any[],
    next: any[],
    nextRound: string
  ): Array<{ player_a_id: string; player_b_id: string; knockout_round: string }> {
    const sorted = [...current].sort((a, b) =>
      String(a.created_at).localeCompare(String(b.created_at))
    )
    const result: Array<{ player_a_id: string; player_b_id: string; knockout_round: string }> = []
    const pairs = Math.floor(sorted.length / 2)
    for (let i = 0; i < pairs; i++) {
      const mA = sorted[i * 2]
      const mB = sorted[i * 2 + 1]
      if (!mA?.winner_id || !mB?.winner_id) continue
      const winA = mA.winner_id as string
      const winB = mB.winner_id as string
      const exists = next.some((nm: any) =>
        (nm.player_a_id === winA && nm.player_b_id === winB) ||
        (nm.player_a_id === winB && nm.player_b_id === winA)
      )
      if (!exists) result.push({ player_a_id: winA, player_b_id: winB, knockout_round: nextRound })
    }
    return result
  }

  async function generarSiguienteRonda(pairs: Array<{ player_a_id: string; player_b_id: string; knockout_round: string }>) {
    setGenerating(true)
    setMsg(null)
    try {
      const nextRound = pairs[0]?.knockout_round
      // Para semifinal: usa fix_semis para garantizar cruces correctos (IZQ vs IZQ, DER vs DER)
      const action   = nextRound === 'semifinal' ? 'fix_semis' : 'create_matches'
      const body     = action === 'fix_semis' ? { action } : { action, pairs }
      const res = await fetch('/api/knockout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok) setMsg(json.error ?? 'Error al generar')
    } catch {
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

  const octavosM   = (bracket.octavos   ?? []) as any[]
  const cuartosM   = (bracket.cuartos   ?? []) as any[]
  const semifinalM = (bracket.semifinal ?? []) as any[]
  const finalM     = (bracket.final     ?? []) as any[]

  // Calcular pares disponibles por ronda
  const pairsOctCuartos  = getAvailablePairs(octavosM,   cuartosM,   'cuartos')
  const pairsCuartosSemi = getAvailablePairs(cuartosM,   semifinalM, 'semifinal')
  const pairsSemiFinal   = getAvailablePairs(semifinalM, finalM,     'final')

  const pendingPairs =
    pairsOctCuartos.length  > 0 ? pairsOctCuartos  :
    pairsCuartosSemi.length > 0 ? pairsCuartosSemi :
    pairsSemiFinal.length   > 0 ? pairsSemiFinal   : []

  const pendingNextRound = pendingPairs[0]?.knockout_round ?? ''

  const hasPendingNext = pendingPairs.length > 0

  // Campeón
  const finalMatch = (bracket as any)['final']?.[0]
  const isChampion = finalMatch?.status === 'terminado' && finalMatch?.winner_id
  const champion = isChampion ? playerMap.get(finalMatch.winner_id) : null

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

      {/* Error */}
      {msg && hasSiembra ? (
        <div className="bg-red-900/40 border border-red-700 rounded p-2 text-red-300 text-sm">
          {msg}
        </div>
      ) : null}

      {/* Corrección de semis cruzadas — solo si las semis NO tienen resultado aún */}
      {semifinalM.length > 0 && finalM.length === 0 && semifinalM.some((m: any) => !m.winner_id) ? (
        <div className="card flex items-center justify-between gap-4 border-amber-700/50">
          <p className="text-amber-300 text-sm">🔧 ¿Las semis quedaron cruzadas? Corrígelas aquí.</p>
          <button
            onClick={async () => {
              setGenerating(true); setMsg(null)
              try {
                const res = await fetch('/api/knockout', {
                  method: 'POST', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ action: 'fix_semis' }),
                })
                const json = await res.json()
                if (!res.ok) setMsg(json.error ?? 'Error')
              } catch { setMsg('Error de red') }
              await load(); setGenerating(false)
            }}
            disabled={generating}
            className="btn-primary btn-sm shrink-0 bg-amber-700 hover:bg-amber-600"
          >
            {generating ? '…' : 'Corregir semis →'}
          </button>
        </div>
      ) : null}

      {/* Generar final — failsafe directo cuando las dos semis tienen resultado */}
      {semifinalM.length >= 2 && semifinalM.every((m: any) => m.winner_id) && finalM.length === 0 ? (
        <div className="card flex items-center justify-between gap-4 border-gold-500/40">
          <p className="text-ivory-200 text-sm">🏆 Ambas semifinales jugadas — genera la final</p>
          <button
            onClick={async () => {
              setGenerating(true); setMsg(null)
              try {
                const [sA, sB] = semifinalM as any[]
                const res = await fetch('/api/knockout', {
                  method: 'POST', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    action: 'create_matches',
                    pairs: [{ player_a_id: sA.winner_id, player_b_id: sB.winner_id, knockout_round: 'final' }],
                  }),
                })
                const json = await res.json()
                if (!res.ok) setMsg(json.error ?? 'Error')
              } catch { setMsg('Error de red') }
              await load(); setGenerating(false)
            }}
            disabled={generating}
            className="btn-primary btn-sm shrink-0"
          >
            {generating ? '…' : 'Generar Final →'}
          </button>
        </div>
      ) : null}

      {/* Acción: avanzar ronda */}
      {hasPendingNext ? (
        <div className="card flex items-center justify-between gap-4">
          <p className="text-ivory-200 text-sm">
            {pendingPairs.length} partido{pendingPairs.length > 1 ? 's' : ''} de {roundLabel[pendingNextRound] ?? pendingNextRound} listo{pendingPairs.length > 1 ? 's' : ''} para generar
          </p>
          <button
            onClick={() => generarSiguienteRonda(pendingPairs)}
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

      {/* Cerrar torneo */}
      {champion && data?.tournament?.status !== 'finalizado' ? (
        <div className="card flex items-center justify-between gap-4 border-felt-600">
          <p className="text-felt-300 text-sm">El torneo tiene campeón. Ciérralo para archivarlo.</p>
          <button
            onClick={async () => {
              if (!confirm('¿Cerrar el torneo? Esta acción no se puede deshacer.')) return
              setGenerating(true)
              try {
                const res = await fetch('/api/tournament', {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ action: 'close' }),
                })
                const json = await res.json()
                if (!res.ok) setMsg(json.error ?? 'Error')
                else await load()
              } catch { setMsg('Error de red') }
              setGenerating(false)
            }}
            disabled={generating}
            className="btn-primary btn-sm shrink-0 bg-felt-700 hover:bg-felt-600"
          >
            {generating ? '…' : 'Cerrar torneo'}
          </button>
        </div>
      ) : null}

      {data?.tournament?.status === 'finalizado' ? (
        <div className="card text-center border-felt-700 bg-felt-900/40">
          <p className="text-felt-400 text-sm">Torneo finalizado y archivado.</p>
        </div>
      ) : null}
    </div>
  )
}
