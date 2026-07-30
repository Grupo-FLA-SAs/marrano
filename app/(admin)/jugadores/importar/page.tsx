'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ImportarJugadoresPage() {
  const router = useRouter()
  const [csvText, setCsvText] = useState('')
  const [preview, setPreview] = useState<Array<{ full_name: string; short_name: string; handicap: number; notes: string }>>([])
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{ ok: number; errors: string[] } | null>(null)

  function parseCsv(text: string) {
    const lines = text.trim().split('\n').filter(l => l.trim())
    if (lines.length === 0) return []

    // Detectar encabezado
    const header = lines[0].toLowerCase()
    const hasHeader = header.includes('nombre') || header.includes('handicap')
    const dataLines = hasHeader ? lines.slice(1) : lines

    return dataLines.map(line => {
      const cols = line.split(',').map(c => c.trim().replace(/^["']|["']$/g, ''))
      return {
        full_name: cols[0] ?? '',
        short_name: cols[1] ?? '',
        handicap: parseInt(cols[2] ?? '15') || 15,
        notes: cols[3] ?? '',
      }
    }).filter(r => r.full_name)
  }

  function handleTextChange(text: string) {
    setCsvText(text)
    setPreview(parseCsv(text))
    setResult(null)
  }

  async function handleImport() {
    if (preview.length === 0) return
    setImporting(true)

    // Obtener torneo activo
    const tRes = await fetch('/api/tournament')
    const tJson = await tRes.json()
    if (!tJson.data) {
      setResult({ ok: 0, errors: ['No hay torneo activo.'] })
      setImporting(false)
      return
    }

    const errors: string[] = []
    let ok = 0

    for (const player of preview) {
      if (!player.full_name || player.handicap <= 0) {
        errors.push(`Fila inválida: ${JSON.stringify(player)}`)
        continue
      }
      const res = await fetch('/api/players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: player.full_name,
          short_name: player.short_name || null,
          handicap: player.handicap,
          notes: player.notes || null,
        }),
      })
      if (!res.ok) {
        const json = await res.json()
        errors.push(`${player.full_name}: ${json.error ?? 'Error'}`)
      } else {
        ok++
      }
    }

    setResult({ ok, errors })
    setImporting(false)

    if (errors.length === 0) {
      setTimeout(() => { router.push('/jugadores'); router.refresh() }, 1500)
    }
  }

  return (
    <div className="max-w-xl space-y-6 fade-in">
      <h1 className="text-2xl font-display font-bold text-gold-400">📄 Importar jugadores desde CSV</h1>

      <div className="card">
        <p className="text-sm text-ivory-300 mb-2">
          Formato: <code className="text-chalk-300">nombre_completo, apodo, handicap, notas</code>
        </p>
        <p className="text-xs text-felt-400 mb-3">
          La primera fila puede ser un encabezado (se detecta automáticamente). El hándicap es obligatorio y debe ser mayor a 0.
        </p>
        <div className="bg-carbon-900 rounded p-3 text-xs text-felt-300 font-mono mb-3">
          Juan Pérez, El Taco, 15, Jugador fuerte{'\n'}
          María García,, 12,{'\n'}
          Carlos López, Carlitos, 20, Novato
        </div>
      </div>

      <div>
        <label className="label">Pega tu CSV aquí</label>
        <textarea
          className="input h-40 font-mono text-xs resize-y"
          placeholder="Juan Pérez, El Taco, 15&#10;María García,, 12"
          value={csvText}
          onChange={e => handleTextChange(e.target.value)}
        />
      </div>

      {preview.length > 0 && (
        <div>
          <p className="text-xs text-felt-400 mb-2">{preview.length} jugadores detectados:</p>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {preview.map((p, i) => (
              <div key={i} className="flex items-center gap-3 text-sm bg-felt-800 rounded px-3 py-1.5">
                <span className="text-ivory-200 flex-1">{p.full_name}</span>
                {p.short_name && <span className="text-felt-400">({p.short_name})</span>}
                <span className="text-gold-400 font-bold">{p.handicap}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {result && (
        <div className={`rounded-lg p-3 text-sm ${result.errors.length === 0
          ? 'bg-felt-700 border border-felt-500 text-ivory-200'
          : 'bg-gold-400/10 border border-gold-400/30 text-gold-200'}`}>
          <p>✓ {result.ok} jugadores importados.</p>
          {result.errors.map((e, i) => <p key={i} className="text-red-300 text-xs mt-1">{e}</p>)}
        </div>
      )}

      <div className="flex gap-3">
        <button onClick={() => router.back()} className="btn-secondary flex-1">Cancelar</button>
        <button
          onClick={handleImport}
          disabled={preview.length === 0 || importing}
          className="btn-primary flex-1"
        >
          {importing ? 'Importando…' : `Importar ${preview.length} jugadores`}
        </button>
      </div>
    </div>
  )
}
