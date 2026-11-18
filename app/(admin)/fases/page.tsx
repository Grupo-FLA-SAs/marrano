'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const statusColors: Record<string, string> = {
  pendiente: 'badge-gray', activa: 'badge-green', finalizada: 'badge-gold', borrador: 'badge-gray',
}
const statusLabels: Record<string, string> = {
  pendiente: 'Pendiente', activa: 'Activa', finalizada: 'Finalizada', borrador: 'Borrador',
}

export default function FasesPage() {
  const [phases, setPhases] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)
  const router = useRouter()

  async function load() {
    const res = await fetch('/api/phases')
    const json = await res.json()
    setPhases(json.data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm('¿Eliminar esta fase en borrador?')) return
    setDeleting(id)
    await fetch(`/api/phases/${id}`, { method: 'DELETE' })
    await load()
    setDeleting(null)
  }

  if (loading) return <div className="text-felt-400 text-sm p-4">Cargando…</div>

  return (
    <div className="space-y-5 fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-display font-bold text-gold-400">🐷 La Marranera</h1>
        <Link href="/fases/nueva" className="btn-primary">➕ Nueva fase</Link>
      </div>

      {phases.length === 0 && (
        <div className="card text-center py-8">
          <p className="text-felt-400 mb-4">No hay fases creadas aún.</p>
          <Link href="/fases/nueva" className="btn-primary inline-flex">➕ Crear primera fase</Link>
        </div>
      )}

      <div className="space-y-3">
        {phases.map((phase: any) => (
          <Link key={phase.id} href={`/fases/${phase.id}`}
            className="card flex items-center gap-4 hover:border-gold-400 transition-colors">
            <div className="w-8 h-8 rounded-full bg-gold-400 text-carbon-900 flex items-center justify-center font-bold text-sm flex-shrink-0">
              {phase.phase_number}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-ivory-200 font-medium">{phase.name}</p>
              <p className="text-felt-400 text-xs">
                {phase.num_groups} grupos · {phase.qualifiers_per_group} clasificados por grupo
              </p>
            </div>
            <span className={statusColors[phase.status] ?? 'badge-gray'}>
              {statusLabels[phase.status] ?? phase.status}
            </span>
            {phase.status === 'borrador' ? (
              <button
                onClick={(e) => handleDelete(phase.id, e)}
                disabled={deleting === phase.id}
                className="text-red-400 hover:text-red-300 text-lg leading-none px-1 shrink-0"
                title="Eliminar fase"
              >
                {deleting === phase.id ? '…' : '🗑'}
              </button>
            ) : (
              <span className="text-gold-400">›</span>
            )}
          </Link>
        ))}
      </div>
    </div>
  )
}
