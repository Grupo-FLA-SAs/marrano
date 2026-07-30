'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { drawGroups, groupName } from '@/lib/business/draws'

export default function SorteoPage() {
  const { id: phaseId } = useParams<{ id: string }>()
  const router = useRouter()
  const [phase, setPhase] = useState<any>(null)
  const [players, setPlayers] = useState<any[]>([])
  const [groups, setGroups] = useState<string[][]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [modo, setModo] = useState<'aleatorio' | 'manual'>('aleatorio')
  const [selected, setSelected] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const [phaseRes, playersRes] = await Promise.all([
        fetch(`/api/phases/${phaseId}`).then(r => r.json()),
        fetch('/api/players').then(r => r.json()),
      ])
      const p = phaseRes.data?.phase
      if (!p) return
      setPhase(p)
      const allPlayers: any[] = playersRes.data ?? []
      setPlayers(allPlayers)
      setGroups(drawGroups(allPlayers.map((pl: any) => pl.id), p.num_groups))
    }
    load()
  }, [phaseId])

  const resortear = useCallback(() => {
    if (!phase) return
    setGroups(drawGroups(players.map(p => p.id), phase.num_groups))
  }, [players, phase])

  const vaciarGrupos = useCallback(() => {
    if (!phase) return
    setGroups(Array.from({ length: phase.num_groups }, () => []))
    setModo('manual')
  }, [phase])

  function addToGroup(playerId: string, toGroup: number) {
    setGroups(prev => {
      const updated = prev.map(g => [...g])
      updated[toGroup] = [...updated[toGroup], playerId]
      return updated
    })
  }

  function removeFromGroup(playerId: string, fromGroup: number) {
    setGroups(prev => {
      const updated = prev.map(g => [...g])
      updated[fromGroup] = updated[fromGroup].filter(id => id !== playerId)
      return updated
    })
  }

  function movePlayer(playerId: string, fromGroup: number, toGroup: number) {
    setGroups(prev => {
      const updated = prev.map(g => [...g])
      const fi = updated[fromGroup].indexOf(playerId)
      if (fi === -1) return prev
      updated[fromGroup].splice(fi, 1)
      updated[toGroup].push(playerId)
      return updated
    })
  }

  function getPlayer(id: string) {
    return players.find(p => p.id === id)
  }

  const assignedIds = groups.flat()
  const unassigned = players.filter(p => !assignedIds.includes(p.id))

  async function confirmarSorteo() {
    if (!phase) return
    setSaving(true)
    setError(null)

    const groupsPayload = groups
      .filter(g => g.length > 0)
      .map((g, i) => ({ name: `Grupo ${groupName(i)}`, players: g }))

    const res = await fetch(`/api/phases/${phaseId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'confirm_draw', groups: groupsPayload }),
    })

    if (!res.ok) {
      const json = await res.json()
      setError(json.error ?? 'Error al confirmar sorteo')
      setSaving(false)
      return
    }

    router.push(`/fases/${phaseId}`)
    router.refresh()
  }

  if (!phase || players.length === 0) {
    return <div className="text-felt-400">Cargando jugadores…</div>
  }

  const totalMatches = groups.reduce((sum, g) => sum + g.length * (g.length - 1) / 2, 0)

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold text-gold-400">🎲 Asignación de grupos</h1>
          <p className="text-felt-300 text-sm">{phase.name} · {players.length} jugadores</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {modo === 'aleatorio' && (
            <button onClick={resortear} className="btn-secondary">🔀 Volver a sortear</button>
          )}
          <button
            onClick={modo === 'manual'
              ? () => { resortear(); setModo('aleatorio') }
              : vaciarGrupos}
            className="btn-secondary"
          >
            {modo === 'manual' ? '🎲 Modo aleatorio' : '✏️ Asignar manualmente'}
          </button>
        </div>
      </div>

      {/* Panel sin grupo — solo modo manual */}
      {modo === 'manual' && (
        <div className="card space-y-3">
          <p className="text-xs font-semibold text-ivory-400 uppercase tracking-wide">
            Sin grupo ({unassigned.length})
          </p>

          {unassigned.length === 0 ? (
            <p className="text-felt-400 text-sm">✓ Todos los jugadores están asignados</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {unassigned.map(p => (
                <button
                  key={p.id}
                  onClick={() => setSelected(selected === p.id ? null : p.id)}
                  className={`px-2 py-1 rounded text-sm border transition-colors ${
                    selected === p.id
                      ? 'bg-gold-400 text-carbon-900 border-gold-400 font-bold'
                      : 'bg-felt-700 border-felt-600 text-ivory-200 hover:border-gold-400'
                  }`}
                >
                  {p.short_name ?? p.full_name}
                  <span className="text-xs ml-1 opacity-70">H:{p.handicap}</span>
                </button>
              ))}
            </div>
          )}

          {selected && (
            <div className="flex flex-wrap gap-2 pt-2 border-t border-felt-700">
              <span className="text-xs text-felt-400 self-center">Asignar a:</span>
              {groups.map((_, gi) => (
                <button
                  key={gi}
                  onClick={() => { addToGroup(selected, gi); setSelected(null) }}
                  className="text-xs px-3 py-1.5 bg-felt-600 hover:bg-gold-400 hover:text-carbon-900 rounded font-medium transition-colors"
                >
                  Grupo {groupName(gi)}
                </button>
              ))}
            </div>
          )}

          {!selected && unassigned.length > 0 && (
            <p className="text-xs text-felt-500">Haz clic en un jugador para seleccionarlo, luego elige el grupo</p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {groups.map((groupPlayers, gi) => (
          <div key={gi} className="card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-gold-400">Grupo {groupName(gi)}</h3>
              <span className="badge-gray">{groupPlayers.length} jug.</span>
            </div>
            <div className="space-y-2">
              {groupPlayers.map(pid => {
                const p = getPlayer(pid)
                if (!p) return null
                return (
                  <div key={pid} className="flex items-center justify-between">
                    <div className="text-sm">
                      <span className="text-ivory-200">{p.short_name ?? p.full_name}</span>
                      <span className="text-gold-400 ml-2 text-xs">H:{p.handicap}</span>
                    </div>
                    <div className="flex gap-1 items-center">
                      {modo === 'aleatorio' && groups.map((_, ti) => ti !== gi && (
                        <button key={ti} onClick={() => movePlayer(pid, gi, ti)}
                          className="text-felt-400 hover:text-gold-400 text-xs px-1">
                          →{groupName(ti)}
                        </button>
                      ))}
                      {modo === 'manual' && (
                        <button
                          onClick={() => removeFromGroup(pid, gi)}
                          className="text-felt-500 hover:text-red-400 text-xs px-1 ml-2"
                          title="Quitar del grupo"
                        >✕</button>
                      )}
                    </div>
                  </div>
                )
              })}
              {groupPlayers.length === 0 && (
                <p className="text-felt-500 text-xs italic">Vacío</p>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-carbon-900/50 rounded-xl p-4 text-sm text-felt-300">
        <p>Se generarán <strong className="text-ivory-200">{totalMatches}</strong> partidos todos contra todos.</p>
        <p className="mt-1">Una vez confirmado, el sorteo quedará bloqueado y los partidos se crearán automáticamente.</p>
      </div>

      {unassigned.length > 0 && modo === 'manual' && (
        <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-3 text-yellow-300 text-sm">
          ⚠ Quedan {unassigned.length} jugadores sin asignar.
        </div>
      )}

      {error && (
        <div className="bg-red-900/40 border border-red-700 rounded-lg p-3 text-red-300 text-sm">{error}</div>
      )}

      <div className="flex gap-3">
        <button onClick={() => router.back()} className="btn-secondary flex-1">Cancelar</button>
        <button
          onClick={confirmarSorteo}
          disabled={saving || (modo === 'manual' && unassigned.length > 0)}
          className="btn-primary flex-1 btn-lg"
        >
          {saving ? 'Confirmando…' : '✓ Confirmar y crear partidos'}
        </button>
      </div>
    </div>
  )
}
