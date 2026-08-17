'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

export default function EditarJugadorPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [player, setPlayer] = useState<any>(null)
  const [form, setForm] = useState({
    full_name: '', short_name: '', handicap: 15, notes: '', status: 'activo',
  })
  const [newHandicap, setNewHandicap] = useState<number>(15)
  const [hasPlayedMatches, setHasPlayedMatches] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'error' | 'warn'; text: string } | null>(null)

  useEffect(() => {
    fetch(`/api/players/${id}`)
      .then(r => r.json())
      .then(({ data, matchCount }) => {
        if (data) {
          setPlayer(data)
          setForm({
            full_name: data.full_name,
            short_name: data.short_name ?? '',
            handicap: data.handicap,
            notes: data.notes ?? '',
            status: data.status ?? 'activo',
          })
          setNewHandicap(data.handicap)
          setHasPlayedMatches(matchCount > 0)
        }
      })
  }, [id])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMsg(null)

    const res = await fetch(`/api/players/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: form.full_name,
        short_name: form.short_name || null,
        handicap: newHandicap,
        notes: form.notes || null,
        status: form.status,
      }),
    })

    if (!res.ok) {
      const json = await res.json()
      setMsg({ type: 'error', text: json.error ?? 'Error al guardar' })
    } else {
      const handicapChanged = newHandicap !== player?.handicap
      if (handicapChanged && hasPlayedMatches) {
        setMsg({
          type: 'warn',
          text: `✓ Guardado. El nuevo hándicap (${newHandicap}) aplica solo a partidos futuros. ` +
                `Los sets ya jugados conservan su hándicap original (${player.handicap}).`,
        })
      } else {
        setMsg({ type: 'ok', text: 'Jugador actualizado correctamente.' })
      }
    }
    setSaving(false)
  }

  if (!player) return <div className="text-felt-400">Cargando…</div>

  return (
    <div className="max-w-md space-y-6 fade-in">
      <h1 className="text-2xl font-display font-bold text-gold-400">✏️ Editar jugador</h1>

      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="label">Nombre completo *</label>
          <input className="input" value={form.full_name}
            onChange={e => setForm({ ...form, full_name: e.target.value })} required />
        </div>
        <div>
          <label className="label">Apodo o nombre corto</label>
          <input className="input" value={form.short_name}
            onChange={e => setForm({ ...form, short_name: e.target.value })} />
        </div>
        <div>
          <label className="label">Hándicap</label>
          <input type="number" className="input" min={1} max={500}
            value={newHandicap}
            onChange={e => setNewHandicap(+e.target.value)} />
          {hasPlayedMatches && newHandicap !== player.handicap && (
            <div className="mt-2 bg-gold-400/10 border border-gold-400/30 rounded-lg p-2.5">
              <p className="text-gold-300 text-xs">
                ⚠️ Este jugador ya tiene partidos registrados. El nuevo hándicap ({newHandicap})
                aplica solo a partidos futuros. Los sets ya jugados conservan
                su hándicap original ({player.handicap}).
              </p>
            </div>
          )}
        </div>
        <div>
          <label className="label">Estado</label>
          <select className="input" value={form.status}
            onChange={e => setForm({ ...form, status: e.target.value })}>
            <option value="activo">Activo</option>
            <option value="retirado">Retirado</option>
          </select>
        </div>
        <div>
          <label className="label">Observaciones</label>
          <textarea className="input h-20 resize-none" value={form.notes}
            onChange={e => setForm({ ...form, notes: e.target.value })} />
        </div>

        {msg && (
          <div className={`rounded-lg p-3 text-sm ${
            msg.type === 'ok' ? 'bg-felt-700 border border-felt-500 text-ivory-200' :
            msg.type === 'warn' ? 'bg-gold-400/10 border border-gold-400/30 text-gold-200' :
            'bg-red-900/40 border border-red-700 text-red-300'
          }`}>{msg.text}</div>
        )}

        <div className="flex gap-3">
          <button type="button" onClick={() => router.back()} className="btn-secondary flex-1">
            Cancelar
          </button>
          <button type="submit" disabled={saving} className="btn-primary flex-1">
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </form>

      {/* Eliminar jugador */}
      {!hasPlayedMatches && (
        <div className="border-t border-felt-700 pt-4">
          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              className="text-red-400 hover:text-red-300 text-sm transition-colors"
            >
              🗑️ Eliminar jugador
            </button>
          ) : (
            <div className="bg-red-900/20 border border-red-700 rounded-xl p-4 space-y-3">
              <p className="text-red-300 text-sm font-medium">
                ¿Seguro que querés eliminar a <strong>{player.full_name}</strong>? Esta acción no se puede deshacer.
              </p>
              <div className="flex gap-2">
                <button onClick={() => setConfirmDelete(false)} className="btn-secondary flex-1 text-sm">
                  Cancelar
                </button>
                <button
                  disabled={deleting}
                  onClick={async () => {
                    setDeleting(true)
                    const res = await fetch(`/api/players/${id}`, { method: 'DELETE' })
                    if (res.ok) {
                      router.push('/jugadores')
                    } else {
                      const json = await res.json()
                      setMsg({ type: 'error', text: json.error ?? 'Error al eliminar' })
                      setConfirmDelete(false)
                      setDeleting(false)
                    }
                  }}
                  className="flex-1 bg-red-700 hover:bg-red-600 text-white rounded-xl px-4 py-2 text-sm font-medium transition-colors"
                >
                  {deleting ? 'Eliminando…' : 'Sí, eliminar'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
