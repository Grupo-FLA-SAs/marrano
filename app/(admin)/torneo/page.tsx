'use client'

import { useState, useEffect } from 'react'

export default function TorneoPage() {
  const [tournament, setTournament] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'error'; text: string } | null>(null)
  const [form, setForm] = useState({
    name: '', description: '', start_date: '',
    max_entries_per_set: 30, sets_to_win: 2,
    has_third_place_match: false, public_link_enabled: false,
  })

  useEffect(() => {
    fetch('/api/tournament')
      .then(r => r.json())
      .then(({ data }) => {
        if (data) {
          setTournament(data)
          setForm({
            name: data.name,
            description: data.description ?? '',
            start_date: data.start_date ? data.start_date.slice(0, 10) : '',
            max_entries_per_set: data.max_entries_per_set,
            sets_to_win: data.sets_to_win,
            has_third_place_match: data.has_third_place_match,
            public_link_enabled: data.public_link_enabled,
          })
        }
        setLoading(false)
      })
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMsg(null)

    const res = await fetch('/api/tournament', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const json = await res.json()

    if (!res.ok) {
      setMsg({ type: 'error', text: json.error ?? 'Error al guardar' })
    } else {
      setTournament(json.data)
      setMsg({ type: 'ok', text: tournament ? 'Torneo actualizado.' : '¡Torneo creado! Ya puedes agregar jugadores.' })
    }
    setSaving(false)
  }

  async function iniciarTorneo() {
    const res = await fetch('/api/tournament', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, status: 'en_curso' }),
    })
    const json = await res.json()
    if (res.ok) setTournament(json.data)
  }

  const publicUrl = tournament?.public_token
    ? `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/p/${tournament.public_token}`
    : null

  if (loading) return <div className="text-felt-400">Cargando…</div>

  return (
    <div className="max-w-xl space-y-6 fade-in">
      <h1 className="text-2xl font-display font-bold text-gold-400">
        ⚙️ {tournament ? 'Configuración del torneo' : 'Crear torneo'}
      </h1>

      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="label">Nombre del torneo *</label>
          <input className="input" value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            placeholder="MARRANO 2025" required />
        </div>
        <div>
          <label className="label">Descripción (opcional)</label>
          <textarea className="input h-20 resize-none" value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
            placeholder="Torneo entre amigos…" />
        </div>
        <div>
          <label className="label">Fecha de inicio *</label>
          <input type="date" className="input" value={form.start_date}
            onChange={e => setForm({ ...form, start_date: e.target.value })} required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Entradas máx. por set</label>
            <input type="number" className="input" min={1} max={100}
              value={form.max_entries_per_set}
              onChange={e => setForm({ ...form, max_entries_per_set: +e.target.value })} />
          </div>
          <div>
            <label className="label">Sets para ganar</label>
            <input type="number" className="input" min={1} max={5}
              value={form.sets_to_win}
              onChange={e => setForm({ ...form, sets_to_win: +e.target.value })} />
          </div>
        </div>
        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" className="w-4 h-4 accent-gold-400"
              checked={form.has_third_place_match}
              onChange={e => setForm({ ...form, has_third_place_match: e.target.checked })} />
            <div>
              <div className="text-ivory-200 text-sm font-medium">Partido por tercer puesto</div>
              <div className="text-felt-400 text-xs">Semifinalistas perdedores juegan por el 3er lugar</div>
            </div>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" className="w-4 h-4 accent-gold-400"
              checked={form.public_link_enabled}
              onChange={e => setForm({ ...form, public_link_enabled: e.target.checked })} />
            <div>
              <div className="text-ivory-200 text-sm font-medium">Activar vista pública</div>
              <div className="text-felt-400 text-xs">Permite ver resultados sin iniciar sesión</div>
            </div>
          </label>
        </div>

        {msg && (
          <div className={`rounded-lg p-3 text-sm ${msg.type === 'ok'
            ? 'bg-felt-700 border border-felt-500 text-ivory-200'
            : 'bg-red-900/40 border border-red-700 text-red-300'}`}>
            {msg.text}
          </div>
        )}

        <button type="submit" disabled={saving} className="btn-primary w-full">
          {saving ? 'Guardando…' : tournament ? 'Guardar cambios' : 'Crear torneo'}
        </button>
      </form>

      {tournament && form.public_link_enabled && publicUrl && (
        <div className="card">
          <p className="text-xs font-semibold text-ivory-400 uppercase tracking-wide mb-2">
            Enlace público
          </p>
          <div className="flex items-center gap-2">
            <code className="text-xs text-chalk-300 bg-felt-800 rounded px-2 py-1 flex-1 truncate">
              {publicUrl}
            </code>
            <button onClick={() => navigator.clipboard.writeText(publicUrl)}
              className="btn-secondary btn-sm whitespace-nowrap">
              Copiar
            </button>
          </div>
        </div>
      )}

      {tournament && (
        <div className="card border-red-900/50">
          <p className="text-xs font-semibold text-red-400 uppercase tracking-wide mb-2">
            Estado del torneo
          </p>
          <p className="text-sm text-felt-300 mb-3">
            Estado actual: <span className="text-ivory-200 font-medium">{tournament.status}</span>
          </p>
          {tournament.status === 'configuracion' && (
            <button onClick={iniciarTorneo} className="btn-primary btn-sm">
              🚀 Iniciar torneo
            </button>
          )}
        </div>
      )}
    </div>
  )
}
