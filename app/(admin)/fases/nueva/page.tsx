'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { projectedQualifiers, groupSizeDistribution } from '@/lib/business/draws'

export default function NuevaFasePage() {
  const router = useRouter()
  const [availablePlayers, setAvailablePlayers] = useState(0)
  const [form, setForm] = useState({
    name: '', num_groups: 4, qualifiers_per_group: 3, allow_uneven_groups: true,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Cargar conteo de jugadores disponibles
    fetch('/api/players').then(r => r.json()).then(({ data }) => {
      setAvailablePlayers((data ?? []).length)
    })
  }, [])

  const projected = projectedQualifiers(form.num_groups, form.qualifiers_per_group)
  const dist = groupSizeDistribution(availablePlayers, form.num_groups)
  const isExactly16 = projected === 16

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const res = await fetch('/api/phases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name.trim(),
        num_groups: form.num_groups,
        qualifiers_per_group: form.qualifiers_per_group,
        allow_uneven_groups: form.allow_uneven_groups,
      }),
    })
    const json = await res.json()

    if (!res.ok) {
      setError(json.error ?? 'Error al crear fase')
      setSaving(false)
      return
    }

    router.push(`/fases/${json.data.id}/sorteo`)
    router.refresh()
  }

  return (
    <div className="max-w-md space-y-6 fade-in">
      <h1 className="text-2xl font-display font-bold text-gold-400">➕ Nueva fase</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Nombre de la fase *</label>
          <input className="input" value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            placeholder="Fase 1 — Grupos de apertura" required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Número de grupos</label>
            <input type="number" className="input" min={1} max={50}
              value={form.num_groups}
              onChange={e => setForm({ ...form, num_groups: +e.target.value })} />
          </div>
          <div>
            <label className="label">Clasificados por grupo</label>
            <input type="number" className="input" min={1}
              value={form.qualifiers_per_group}
              onChange={e => setForm({ ...form, qualifiers_per_group: +e.target.value })} />
          </div>
        </div>

        <div className={`rounded-lg p-3 text-sm border ${
          isExactly16 ? 'bg-felt-700 border-felt-500' : 'bg-gold-400/10 border-gold-400/30'
        }`}>
          <p className="font-medium text-ivory-200 mb-1">Proyección:</p>
          <ul className="text-felt-300 text-xs space-y-1">
            <li>• Jugadores disponibles: <strong className="text-ivory-200">{availablePlayers}</strong></li>
            <li>• Tamaño de grupos: <strong className="text-ivory-200">
              {dist.min === dist.max ? dist.min : `${dist.min}–${dist.max}`} jugadores
            </strong>{dist.uneven && ' (tamaños diferentes)'}</li>
            <li>• Total clasificados: <strong className={isExactly16 ? 'text-gold-400' : 'text-yellow-400'}>
              {projected}
            </strong>{!isExactly16 && ' ← necesitas 16 para eliminatorias'}</li>
          </ul>
        </div>

        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" className="w-4 h-4 accent-gold-400"
            checked={form.allow_uneven_groups}
            onChange={e => setForm({ ...form, allow_uneven_groups: e.target.checked })} />
          <div>
            <div className="text-ivory-200 text-sm">Permitir grupos de tamaños distintos</div>
            <div className="text-felt-400 text-xs">Si el total no es divisible entre los grupos</div>
          </div>
        </label>

        {error && (
          <div className="bg-red-900/40 border border-red-700 rounded-lg p-3 text-red-300 text-sm">{error}</div>
        )}

        <div className="flex gap-3">
          <button type="button" onClick={() => router.back()} className="btn-secondary flex-1">Cancelar</button>
          <button type="submit" disabled={saving} className="btn-primary flex-1">
            {saving ? 'Creando…' : 'Crear y sortear'}
          </button>
        </div>
      </form>
    </div>
  )
}
