'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { calcGroupStandings } from '@/lib/business/standings'
import { applyTiebreakers, type RankedStanding } from '@/lib/business/tiebreakers'

// Encuentra los bloques de jugadores empatados que necesitan resolución manual
function findTiedBlocks(ranked: RankedStanding[]): { startPos: number; players: RankedStanding[] }[] {
  const blocks: { startPos: number; players: RankedStanding[] }[] = []
  let i = 0
  while (i < ranked.length) {
    if (ranked[i].needs_manual_resolution) {
      const block = [ranked[i]]
      const startPos = ranked[i].position
      while (i + 1 < ranked.length && ranked[i + 1].needs_manual_resolution && ranked[i + 1].points === ranked[i].points) {
        i++
        block.push(ranked[i])
      }
      blocks.push({ startPos, players: block })
    }
    i++
  }
  return blocks
}

export default function CierreFasePage() {
  const { id: phaseId } = useParams<{ id: string }>()
  const router = useRouter()
  const [phase, setPhase] = useState<any>(null)
  const [groupsData, setGroupsData] = useState<any[]>([])
  const [issues, setIssues] = useState<string[]>([])
  const [closing, setClosing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // manualOverrides: { groupId: { playerId: assignedPosition } }
  const [manualOverrides, setManualOverrides] = useState<Record<string, Record<string, number>>>({})
  // penaltyOrder: { groupId: playerId[] } — orden en que el admin fue clickeando (ganador primero)
  const [penaltyOrder, setPenaltyOrder] = useState<Record<string, string[]>>({})

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/phases/${phaseId}`)
      const json = await res.json()
      if (!json.data) return

      const { phase: p, groups, members, matches } = json.data
      setPhase(p)

      const allIssues: string[] = []
      const groupDataList = []

      for (const group of groups ?? []) {
        const gMembers = (members ?? []).filter((m: any) => m.group_id === group.id)
        const gMatches = (matches ?? []).filter((m: any) => m.group_id === group.id)
        const players = gMembers.map((m: any) => ({
          id: m.pid ?? m.player_id,
          full_name: m.full_name,
          short_name: m.short_name,
          handicap: m.handicap,
        }))

        const pending = gMatches.filter((m: any) => !['terminado', 'anulado'].includes(m.status))
        if (pending.length > 0) {
          allIssues.push(`${group.name}: quedan ${pending.length} partido(s) sin terminar.`)
        }

        groupDataList.push({ group, players, gMatches })
      }

      setGroupsData(groupDataList)
      setIssues(allIssues)
    }
    load()
  }, [phaseId])

  // Computed: ranked standings with manual overrides applied
  const rankedGroups = useMemo(() => {
    return groupsData.map(({ group, players, gMatches }) => {
      const overrideMap = manualOverrides[group.id]
        ? new Map(Object.entries(manualOverrides[group.id]).map(([k, v]) => [k, v as number]))
        : undefined
      const standings = calcGroupStandings(players, gMatches)
      const ranked = applyTiebreakers(standings, gMatches, overrideMap)
      return { group, players, gMatches, ranked }
    })
  }, [groupsData, manualOverrides])

  // Cuando cambia penaltyOrder → recalcula manualOverrides
  function applyPenaltyOrder(groupId: string, order: string[], startPos: number) {
    const overrides: Record<string, number> = { ...(manualOverrides[groupId] ?? {}) }
    order.forEach((pid, i) => { overrides[pid] = startPos + i })
    setManualOverrides(prev => ({ ...prev, [groupId]: overrides }))
  }

  function selectPenaltyPlayer(groupId: string, playerId: string, block: { startPos: number; players: RankedStanding[] }) {
    const current = penaltyOrder[groupId] ?? []
    // Si ya está seleccionado → deseleccionar y los siguientes
    if (current.includes(playerId)) {
      const idx = current.indexOf(playerId)
      const newOrder = current.slice(0, idx)
      setPenaltyOrder(prev => ({ ...prev, [groupId]: newOrder }))
      // Limpiar overrides parciales
      const overrides = { ...(manualOverrides[groupId] ?? {}) }
      block.players.forEach(p => { delete overrides[p.player_id] })
      setManualOverrides(prev => ({ ...prev, [groupId]: overrides }))
      return
    }
    const newOrder = [...current, playerId]
    setPenaltyOrder(prev => ({ ...prev, [groupId]: newOrder }))
    if (newOrder.length === block.players.length) {
      applyPenaltyOrder(groupId, newOrder, block.startPos)
    } else {
      // Limpiamos overrides hasta que esté completo
      const overrides = { ...(manualOverrides[groupId] ?? {}) }
      block.players.forEach(p => { delete overrides[p.player_id] })
      setManualOverrides(prev => ({ ...prev, [groupId]: overrides }))
    }
  }

  const allTiesResolved = rankedGroups.every(({ ranked }) =>
    ranked.every(r => !r.needs_manual_resolution)
  )

  async function cerrarFase() {
    if (!phase) return
    setClosing(true)
    setError(null)

    const qualifications = []
    for (const { group, ranked } of rankedGroups) {
      for (const standing of ranked) {
        const isQualified = standing.position <= phase.qualifiers_per_group
        const isLast = standing.position === ranked.length
        qualifications.push({
          tournament_id: phase.tournament_id,
          phase_id: phase.id,
          player_id: standing.player_id,
          group_id: group.id,
          status: isQualified ? 'clasificado' : 'eliminado',
          group_position: standing.position,
          is_marrano: isLast,
        })
      }
    }

    const res = await fetch(`/api/phases/${phaseId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'close_phase', qualifications }),
    })

    if (!res.ok) {
      const json = await res.json()
      setError(json.error ?? 'Error al cerrar fase')
      setClosing(false)
      return
    }

    router.push('/fases')
    router.refresh()
  }

  if (!phase) return <div className="text-felt-400">Cargando…</div>

  return (
    <div className="max-w-xl space-y-5 fade-in">
      <div>
        <button onClick={() => router.back()} className="text-felt-400 text-xs">← Volver</button>
        <h1 className="text-2xl font-display font-bold text-gold-400 mt-1">🔒 Cerrar fase</h1>
        <p className="text-felt-300 text-sm">{phase.name}</p>
      </div>

      {issues.length > 0 && (
        <div className="bg-red-900/30 border border-red-700 rounded-xl p-4">
          <p className="text-red-300 font-semibold text-sm mb-2">⚠ Partidos sin terminar:</p>
          <ul className="space-y-1">
            {issues.map((iss, i) => <li key={i} className="text-red-300 text-xs">• {iss}</li>)}
          </ul>
          <p className="text-red-400 text-xs mt-3">
            Puedes cerrar de todos modos si los partidos faltantes fueron anulados justificadamente.
          </p>
        </div>
      )}

      {rankedGroups.map(({ group, ranked }) => {
        const tiedBlocks = findTiedBlocks(ranked)
        const hasUnresolved = tiedBlocks.length > 0

        return (
          <div key={group.id} className="card space-y-4">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-gold-400">{group.name}</h3>
              {hasUnresolved && (
                <span className="text-xs bg-amber-900/40 border border-amber-700 text-amber-300 px-2 py-0.5 rounded-full">
                  ⚡ Empate por definir
                </span>
              )}
            </div>

            {/* Tabla de posiciones actual */}
            <div className="space-y-2">
              {ranked.map((s: any) => {
                const isQualified = s.position <= phase.qualifiers_per_group
                const isLast = s.position === ranked.length
                return (
                  <div key={s.player_id} className={`flex items-center gap-3 rounded-lg px-2 py-1 ${s.needs_manual_resolution ? 'bg-amber-900/20' : ''}`}>
                    <span className="w-5 text-center font-bold text-ivory-300 text-sm">{s.position}</span>
                    <span className="flex-1 text-sm text-ivory-200">
                      {s.player?.short_name ?? s.player?.full_name}
                      <span className="text-felt-400 text-xs ml-2">({s.points} pts)</span>
                    </span>
                    <div className="flex gap-1">
                      {s.needs_manual_resolution
                        ? <span className="text-xs text-amber-400">⚡ Penaltis</span>
                        : isQualified
                          ? <span className="badge-green">✓ Clasifica</span>
                          : isLast
                            ? <span className="badge-red">🐷 Marrano</span>
                            : <span className="badge-gray">Eliminado</span>
                      }
                    </div>
                  </div>
                )
              })}
            </div>

            {/* UI para resolver cada bloque de empate */}
            {tiedBlocks.map((block, bi) => {
              const gOrder = penaltyOrder[group.id] ?? []
              const blockOrderIds = block.players.map(p => p.player_id).filter(id => gOrder.includes(id))
              const isComplete = blockOrderIds.length === block.players.length
              const posRange = `${block.startPos}–${block.startPos + block.players.length - 1}`
              const qualifiesUpTo = phase.qualifiers_per_group

              // ¿Este bloque incluye posiciones que clasifican Y posiciones que eliminan?
              const blockPositions = block.players.map((_, i) => block.startPos + i)
              const anyQualifies = blockPositions.some(p => p <= qualifiesUpTo)
              const anyEliminated = blockPositions.some(p => p > qualifiesUpTo)

              return (
                <div key={bi} className="border border-amber-700/50 bg-amber-950/30 rounded-xl p-4 space-y-3">
                  <div>
                    <p className="text-amber-300 font-semibold text-sm">
                      ⚡ Empate en posición{block.players.length > 1 ? 'es' : ''} {posRange} — Definición por penaltis
                    </p>
                    <p className="text-amber-400/70 text-xs mt-0.5">
                      {anyQualifies && anyEliminated
                        ? `${blockPositions.filter(p => p <= qualifiesUpTo).length} de estos clasifican, ${blockPositions.filter(p => p > qualifiesUpTo).length} quedan eliminados`
                        : anyQualifies
                          ? 'Todos clasifican — el orden define siembra'
                          : 'Ninguno clasifica — el orden define el 🐷 Marrano'}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-felt-300 mb-2">
                      {isComplete
                        ? '✓ Orden definido. Haz clic en cualquier jugador para reiniciar.'
                        : `Haz clic en el orden de llegada en penaltis (1° mejor, último eliminado):`}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {block.players.map(p => {
                        const idx = gOrder.indexOf(p.player_id)
                        const selected = idx !== -1
                        const orderNum = selected ? idx - gOrder.findIndex(id => block.players.some(bp => bp.player_id === id)) + 1 : null
                        return (
                          <button
                            key={p.player_id}
                            onClick={() => selectPenaltyPlayer(group.id, p.player_id, block)}
                            className={`relative px-3 py-2 rounded-xl text-sm font-medium border transition-all ${
                              selected
                                ? 'bg-amber-600 border-amber-500 text-white'
                                : 'bg-felt-800 border-felt-600 text-ivory-200 hover:border-amber-500'
                            }`}
                          >
                            {selected && (
                              <span className="absolute -top-2 -right-2 bg-gold-400 text-carbon-900 text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                                {orderNum}
                              </span>
                            )}
                            {p.player?.short_name ?? p.player?.full_name}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {isComplete && (
                    <div className="bg-felt-800/60 rounded-lg p-3 space-y-1">
                      <p className="text-xs text-felt-400 font-semibold uppercase tracking-wide">Resultado de penaltis:</p>
                      {block.players.map(p => {
                        const pos = manualOverrides[group.id]?.[p.player_id]
                        const classifies = pos !== undefined && pos <= qualifiesUpTo
                        return (
                          <div key={p.player_id} className="flex items-center justify-between text-sm">
                            <span className="text-ivory-200">{pos}. {p.player?.short_name ?? p.player?.full_name}</span>
                            {classifies
                              ? <span className="badge-green text-xs">✓ Clasifica</span>
                              : pos === ranked.length
                                ? <span className="badge-red text-xs">🐷 Marrano</span>
                                : <span className="badge-gray text-xs">Eliminado</span>
                            }
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )
      })}

      {!allTiesResolved && (
        <div className="bg-amber-900/20 border border-amber-700 rounded-xl p-4">
          <p className="text-amber-300 text-sm font-semibold">⚡ Hay empates sin definir</p>
          <p className="text-amber-400 text-xs mt-1">
            Define el resultado de los penaltis en cada grupo antes de cerrar la fase.
          </p>
        </div>
      )}

      {error && (
        <div className="bg-red-900/40 border border-red-700 rounded-lg p-3 text-red-300 text-sm">{error}</div>
      )}

      <div className="card bg-carbon-900/50">
        <p className="text-sm text-ivory-300 mb-4">
          Al cerrar la fase, los clasificados quedan registrados. Esta acción no borra resultados ni jugadores.
        </p>
        <button
          onClick={cerrarFase}
          disabled={closing || !allTiesResolved}
          className={`btn-primary w-full ${!allTiesResolved ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {closing ? 'Cerrando…' : !allTiesResolved ? '⚡ Resuelve los empates primero' : '🔒 Confirmar cierre de fase'}
        </button>
      </div>
    </div>
  )
}
