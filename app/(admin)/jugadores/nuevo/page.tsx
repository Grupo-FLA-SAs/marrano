'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function NuevoJugadorPage() {
  const router = useRouter()
  const [form, setForm] = useState({ full_name: '', short_name: '', handicap: 15, notes: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const res = await fetch('/api/players', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: form.full_name.trim(),
        short_name: form.short_name.trim() || null,
        handicap: form.handicap,
        notes: form.notes.trim() || null,
      }),
    })

    const json = await res.json()
    if (!res.ok) {
      setError(json.error ?? 'Error al crear jugador')
      setSaving(false)
      return
    }

    router.push('/jugadores')
    router.refresh()
  }

  return (
    <div className="max-w-md space-y-6 fade-in">
      <h1 className="text-2xl font-display font-bold text-gold-400">➕ Nuevo jugador</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Nombre completo *</label>
          <input className="input" value={form.full_name}
            onChange={e => setForm({ ...form, full_name: e.target.value })}
            placeholder="Nombre Apellido" required />
        </div>
        <div>
          <label className="label">Apodo o nombre corto</label>
          <input className="input" value={form.short_name}
            onChange={e => setForm({ ...form, short_name: e.target.value })}
            placeholder="El Taco de Oro" />
        </div>
        <div>
          <label className="label">Hándicap *</label>
          <input type="number" className="input" min={1} max={500}
            value={form.handicap}
            onChange={e => setForm({ ...form, handicap: +e.target.value })} required />
          <p className="text-xs text-felt-400 mt-1">
            Carambolas que debe hacer para ganar un set.
          </p>
        </div>
        <div>
          <label className="label">Observaciones</label>
          <textarea className="input h-20 resize-none" value={form.notes}
            onChange={e => setForm({ ...form, notes: e.target.value })}
            placeholder="Notas adicionales…" />
        </div>

        {error && (
          <div className="bg-red-900/40 border border-red-700 rounded-lg p-3 text-red-300 text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button type="button" onClick={() => router.back()} className="btn-secondary flex-1">
            Cancelar
          </button>
          <button type="submit" disabled={saving} className="btn-primary flex-1">
            {saving ? 'Guardando…' : 'Crear jugador'}
          </button>
        </div>
      </form>
    </div>
  )
}
