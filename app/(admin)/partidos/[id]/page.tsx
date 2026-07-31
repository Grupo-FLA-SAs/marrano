'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { calcMatchWinner } from '@/lib/business/matches'

interface SetData {
  player_a_carambolas: number
  player_b_carambolas: number
  player_a_entries: number
  player_b_entries: number
  winner_id: string
  had_penalty: boolean
  penalty_winner_id: string | null
  confirmed: boolean
}

function emptySet(): SetData {
  return {
    player_a_carambolas: 0, player_b_carambolas: 0,
    player_a_entries: 1, player_b_entries: 1,
    winner_id: '', had_penalty: false, penalty_winner_id: null,
    confirmed: false,
  }
}

function computeWinner(s: SetData, hA: number, hB: number, pidA: string, pidB: string): SetData {
  const aComplete = s.player_a_carambolas >= hA && hA > 0
  const bComplete = s.player_b_carambolas >= hB && hB > 0
  // Ambos completan → penaltis
  if (aComplete && bComplete) return { ...s, had_penalty: true, winner_id: '', penalty_winner_id: null }
  // Solo A completa
  if (aComplete) return { ...s, winner_id: pidA, had_penalty: false, penalty_winner_id: null }
  // Solo B completa
  if (bComplete) return { ...s, winner_id: pidB, had_penalty: false, penalty_winner_id: null }
  // Ninguno completa: ganador por menor distancia al hándicap
  const dA = hA - s.player_a_carambolas
  const dB = hB - s.player_b_carambolas
  if (dA < dB) return { ...s, winner_id: pidA, had_penalty: false, penalty_winner_id: null }
  if (dB < dA) return { ...s, winner_id: pidB, had_penalty: false, penalty_winner_id: null }
  // Distancias iguales → penaltis
  return { ...s, had_penalty: true, winner_id: '', penalty_winner_id: null }
}

export default function PartidoPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [match, setMatch] = useState<any>(null)
  const [tournament, setTournament] = useState<any>(null)
  const [sets, setSets] = useState<SetData[]>([emptySet()])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [correctionReason, setCorrectionReason] = useState('')

  useEffect(() => {
    fetch(`/api/matches/${id}`)
      .then(r => r.json())
      .then(({ data }) => {
        if (!data) return
        const { match: m, sets: existingSets } = data
        setMatch(m)
        fetch('/api/tournament').then(r => r.json()).then(({ data: t }) => setTournament(t))
        if (existingSets && existingSets.length > 0) {
          setSets(existingSets.map((s: any) => ({
            player_a_carambolas: s.player_a_carambolas,
            player_b_carambolas: s.player_b_carambolas,
            player_a_entries: s.player_a_entries,
            player_b_entries: s.player_b_entries,
            winner_id: s.winner_id ?? '',
            had_penalty: s.had_penalty ?? false,
            penalty_winner_id: s.penalty_winner_id ?? null,
            confirmed: true,
          })))
        }
      })
  }, [id])

  function updateField(idx: number, field: keyof SetData, value: any) {
    setSets(prev => prev.map((s, i) => {
      if (i !== idx) return s
      const updated = { ...s, [field]: value }
      if (field === 'player_a_carambolas' || field === 'player_b_carambolas') {
        const hA = match?.player_a?.handicap ?? 0
        const hB = match?.player_b?.handicap ?? 0
        return computeWinner(updated, hA, hB, match.player_a_id, match.player_b_id)
      }
      return updated
    }))
    setError(null)
  }

  function confirmSet(idx: number) {
    const s = sets[idx]
    const effectiveWinner = s.had_penalty ? s.penalty_winner_id : s.winner_id
    if (!effectiveWinner) { setError(`Set ${idx + 1}: falta determinar el ganador.`); return }
    setSets(prev => prev.map((x, i) => i === idx ? { ...x, confirmed: true } : x))
  }

  function editSet(idx: number) {
    setSets(prev => prev.map((x, i) => i === idx ? { ...x, confirmed: false } : x))
  }

  async function handleSave() {
    if (!match) return
    const setsToWin = tournament?.sets_to_win ?? 2
    const setWinners = sets.map((s, i) => ({
      setNumber: i + 1,
      winnerId: s.had_penalty ? (s.penalty_winner_id ?? '') : s.winner_id,
    }))
    const { winnerId, scoreA, scoreB } = calcMatchWinner(
      setWinners, match.player_a_id, match.player_b_id, setsToWin
    )

    const isCorrection = match.status === 'terminado'
    if (isCorrection && !correctionReason.trim()) {
      setError('Debes indicar el motivo de la corrección.')
      return
    }

    if (!winnerId) {
      setError('El partido aún no tiene ganador. Confirma todos los sets.')
      return
    }

    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/matches/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sets: sets.map((s, i) => ({
            set_number: i + 1,
            player_a_carambolas: s.player_a_carambolas,
            player_b_carambolas: s.player_b_carambolas,
            player_a_entries: s.player_a_entries,
            player_b_entries: s.player_b_entries,
            player_a_handicap: match.player_a.handicap,
            player_b_handicap: match.player_b.handicap,
            winner_id: s.had_penalty ? (s.penalty_winner_id ?? s.winner_id) : s.winner_id,
            had_penalty: s.had_penalty,
            penalty_winner_id: s.penalty_winner_id ?? null,
          })),
          matchUpdate: { status: 'terminado', winner_id: winnerId, score_a: scoreA, score_b: scoreB },
          isCorrection,
        }),
      })

      let json: any = null
      try { json = await res.json() } catch { /* ignore */ }

      if (!res.ok) {
        setError(json?.error ?? `Error al guardar (${res.status})`)
        setSaving(false)
        return
      }

      // Forzar lectura fresca de la fase (evita router cache)
      const phaseId = match.phase_id
      if (phaseId) {
        router.push(`/fases/${phaseId}?saved=${id}&t=${Date.now()}`)
      } else {
        router.push(`/?saved=${id}&t=${Date.now()}`)
      }
      router.refresh()
    } catch (e: any) {
      setError(e?.message ?? 'No se pudo conectar al servidor')
      setSaving(false)
    }
  }

  if (!match) return <div className="text-felt-400">Cargando partido…</div>

  const playerA = match.player_a
  const playerB = match.player_b
  const maxEntries = tournament?.max_entries_per_set ?? 30
  const setsToWin = tournament?.sets_to_win ?? 2
  const maxSets = setsToWin * 2 - 1

  const setWinners = sets.filter(s => s.confirmed).map((s, i) => ({
    setNumber: i + 1,
    winnerId: s.had_penalty ? (s.penalty_winner_id ?? '') : s.winner_id,
  }))
  const score = calcMatchWinner(setWinners, match.player_a_id, match.player_b_id, setsToWin)
  const matchOver = score.isComplete
  const allConfirmed = sets.every(s => s.confirmed)
  const canAddSet = !matchOver && sets.length < maxSets && sets.every(s => s.confirmed)

  return (
    <div className="max-w-lg space-y-4 fade-in">
      <div>
        <button onClick={() => router.back()} className="text-felt-400 text-xs hover:text-ivory-300">← Volver</button>
        <h1 className="text-xl font-display font-bold text-gold-400 mt-1">🎱 Registrar partido</h1>
      </div>

      {/* Marcador */}
      <div className="card">
        <div className="flex items-center justify-between">
          <div className="text-center flex-1">
            <div className="text-lg font-bold text-ivory-200">{playerA.short_name ?? playerA.full_name}</div>
            <div className="text-xs text-felt-400 mt-0.5">H: {playerA.handicap}</div>
          </div>
          <div className="text-3xl font-bold text-gold-400 px-4">
            {score.scoreA} – {score.scoreB}
          </div>
          <div className="text-center flex-1">
            <div className="text-lg font-bold text-ivory-200">{playerB.short_name ?? playerB.full_name}</div>
            <div className="text-xs text-felt-400 mt-0.5">H: {playerB.handicap}</div>
          </div>
        </div>
        {matchOver && (
          <div className="mt-3 text-center">
            <span className="badge-green text-sm">
              ✓ Ganador: {score.winnerId === match.player_a_id
                ? (playerA.short_name ?? playerA.full_name)
                : (playerB.short_name ?? playerB.full_name)}
            </span>
          </div>
        )}
      </div>

      {/* Sets */}
      {sets.map((set, idx) => {
        const effectiveWinner = set.had_penalty ? set.penalty_winner_id : set.winner_id
        const winnerName = effectiveWinner === match.player_a_id
          ? (playerA.short_name ?? playerA.full_name)
          : effectiveWinner === match.player_b_id
            ? (playerB.short_name ?? playerB.full_name)
            : null

        if (set.confirmed) {
          // Set confirmado — vista resumida
          return (
            <div key={idx} className="card flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl">✅</span>
                <div>
                  <p className="text-xs text-felt-400">Set {idx + 1}</p>
                  <p className="text-ivory-200 font-bold">{winnerName}</p>
                  <p className="text-xs text-felt-400">
                    {playerA.short_name ?? playerA.full_name}: {set.player_a_carambolas}/{playerA.handicap} ({set.player_a_entries} ent.) ·{' '}
                    {playerB.short_name ?? playerB.full_name}: {set.player_b_carambolas}/{playerB.handicap} ({set.player_b_entries} ent.)
                    {set.had_penalty && ' · ⚡ Penaltis'}
                  </p>
                </div>
              </div>
              <button onClick={() => editSet(idx)} className="btn-secondary btn-sm whitespace-nowrap">
                ✏️ Editar
              </button>
            </div>
          )
        }

        // Set activo — formulario
        return (
          <div key={idx} className="card space-y-4 border-gold-400/30">
            <h3 className="font-bold text-gold-400 text-lg">Set {idx + 1}</h3>

            <div className="grid grid-cols-2 gap-4">
              {([
                { player: playerA, side: 'a' as const },
                { player: playerB, side: 'b' as const },
              ] as const).map(({ player, side }) => {
                const caramb = side === 'a' ? set.player_a_carambolas : set.player_b_carambolas
                const entries = side === 'a' ? set.player_a_entries : set.player_b_entries
                const falta = Math.max(0, player.handicap - caramb)
                const complete = caramb >= player.handicap
                return (
                  <div key={side} className={`space-y-2 rounded-lg p-3 ${complete ? 'bg-felt-600/30 border border-felt-500' : 'bg-felt-800/30'}`}>
                    <p className="text-sm font-bold text-ivory-200">{player.short_name ?? player.full_name}</p>
                    <div>
                      <span className="text-xs text-felt-400">Carambolas</span>
                      <div className="flex items-center gap-2 mt-1">
                        <input type="number" className="input text-center text-lg font-bold" min={0}
                          value={caramb}
                          onChange={e => updateField(idx, `player_${side}_carambolas`, +e.target.value)} />
                        <span className="text-felt-400 text-sm">/ {player.handicap}</span>
                      </div>
                    </div>
                    <div>
                      <span className="text-xs text-felt-400">Entradas (1–{maxEntries})</span>
                      <input type="number" className="input mt-1" min={1} max={maxEntries}
                        value={entries}
                        onChange={e => updateField(idx, `player_${side}_entries`, +e.target.value)} />
                    </div>
                    <p className={`text-xs font-medium ${complete ? 'text-gold-400' : 'text-felt-400'}`}>
                      {complete ? '✓ Completó hándicap' : `Falta: ${falta}`}
                    </p>
                  </div>
                )
              })}
            </div>

            {/* Resultado automático */}
            {set.winner_id && !set.had_penalty && (
              <div className="bg-felt-700 rounded-lg px-4 py-3 text-center">
                <p className="text-xs text-felt-400 mb-1">Ganador del set</p>
                <p className="text-gold-400 font-bold text-lg">
                  {set.winner_id === match.player_a_id
                    ? (playerA.short_name ?? playerA.full_name)
                    : (playerB.short_name ?? playerB.full_name)}
                </p>
              </div>
            )}

            {set.had_penalty && (
              <div className="space-y-3">
                <div className="bg-gold-400/10 border border-gold-400/30 rounded-lg px-4 py-2 text-center text-gold-300 text-sm">
                  ⚡ Empate — definición por penaltis
                </div>
                <div>
                  <p className="text-xs text-felt-400 mb-2">¿Quién ganó los penaltis?</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[{ player: playerA, pid: match.player_a_id }, { player: playerB, pid: match.player_b_id }].map(({ player, pid }) => (
                      <button key={pid} type="button"
                        onClick={() => updateField(idx, 'penalty_winner_id', pid)}
                        className={`btn ${set.penalty_winner_id === pid ? 'btn-primary' : 'btn-secondary'}`}>
                        {player.short_name ?? player.full_name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {effectiveWinner && (
              <button
                onClick={() => confirmSet(idx)}
                className="btn-primary w-full"
              >
                ✓ Confirmar Set {idx + 1}
              </button>
            )}
          </div>
        )
      })}

      {canAddSet && (
        <button onClick={() => setSets(prev => [...prev, emptySet()])} className="btn-secondary w-full">
          ➕ Set {sets.length + 1}
        </button>
      )}

      {match.status === 'terminado' && (
        <div>
          <label className="label">Motivo de la corrección *</label>
          <input className="input" value={correctionReason}
            onChange={e => setCorrectionReason(e.target.value)}
            placeholder="¿Por qué se corrige este resultado?" />
        </div>
      )}

      {error && (
        <div className="bg-red-900/40 border border-red-700 rounded-lg p-3 text-red-300 text-sm">{error}</div>
      )}

      {matchOver && allConfirmed && (
        <button onClick={handleSave} disabled={saving} className="btn-primary btn-lg w-full">
          {saving ? 'Guardando…' : match.status === 'terminado' ? '💾 Corregir resultado' : '✓ Registrar resultado'}
        </button>
      )}
    </div>
  )
}
