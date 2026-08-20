'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { calcGroupStandings } from '@/lib/business/standings'
import { applyTiebreakers } from '@/lib/business/tiebreakers'

export default function CierreFasePage() {
  const { id: phaseId } = useParams<{ id: string }>()
  const router = useRouter()
  const [phase, setPhase] = useState<any>(null)
  const [groupsData, setGroupsData] = useState<any[]>([])
  const [issues, setIssues] = useState<string[]>([])
  const [closing, setClosing] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

        const pending = gMatches.filter((m: any) =>
          !['terminado', 'anulado'].includes(m.status)
        )
        if (pending.length > 0) {
          allIssues.push(`${group.name}: quedan ${pending.length} partido(s) sin terminar.`)
        }

        const standings = calcGroupStandings(players, gMatches)
        const ranked = applyTiebreakers(standings, gMatches)
        const needsManual = ranked.filter(r => r.needs_manual_resolution)
        if (needsManual.length > 0) {
          allIssues.push(`${group.name}: hay empates sin resolver (requieren penaltis externos).`)
        }

        groupDataList.push({ group, ranked })
      }

      setGroupsData(groupDataList)
      setIssues(allIssues)
    }
    load()
  }, [phaseId])

  async function cerrarFase() {
    if (!phase) return
    setClosing(true)
    setError(null)

    const qualifications = []
    for (const { group, ranked } of groupsData) {
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
          <p className="text-red-300 font-semibold text-sm mb-2">⚠ Problemas detectados:</p>
          <ul className="space-y-1">
            {issues.map((iss, i) => <li key={i} className="text-red-300 text-xs">• {iss}</li>)}
          </ul>
          <p className="text-red-400 text-xs mt-3">
            Puedes cerrar de todos modos si los partidos faltantes fueron anulados justificadamente.
          </p>
        </div>
      )}

      {groupsData.map(({ group, ranked }) => (
        <div key={group.id} className="card">
          <h3 className="font-bold text-gold-400 mb-3">{group.name}</h3>
          <div className="space-y-2">
            {ranked.map((s: any) => {
              const isQualified = s.position <= phase.qualifiers_per_group
              const isLast = s.position === ranked.length
              return (
                <div key={s.player_id} className="flex items-center gap-3">
                  <span className="w-5 text-center font-bold text-ivory-300 text-sm">{s.position}</span>
                  <span className="flex-1 text-sm text-ivory-200">
                    {s.player?.short_name ?? s.player?.full_name}
                  </span>
                  <div className="flex gap-1">
                    {isQualified && <span className="badge-green">✓ Clasifica</span>}
                    {isLast && <span className="badge-red">🐷 Marrano</span>}
                    {!isQualified && !isLast && <span className="badge-gray">Eliminado</span>}
                    {s.needs_manual_resolution && <span className="badge-blue">⚠ Pendiente</span>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {error && (
        <div className="bg-red-900/40 border border-red-700 rounded-lg p-3 text-red-300 text-sm">{error}</div>
      )}

      <div className="card bg-carbon-900/50">
        <p className="text-sm text-ivory-300 mb-4">
          Al cerrar la fase, los clasificados quedan registrados. Esta acción no borra resultados ni jugadores.
        </p>
        <button onClick={cerrarFase} disabled={closing} className="btn-primary w-full">
          {closing ? 'Cerrando…' : '🔒 Confirmar cierre de fase'}
        </button>
      </div>
    </div>
  )
}
