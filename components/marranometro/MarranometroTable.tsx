'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils/cn'

export interface MarranometroRow {
  player_id: string
  full_name: string
  short_name: string | null
  handicap: number
  matches_played: number
  win_pct: number
  avg_sets_won_per_match: number
  avg_set_diff_per_match: number
  avg_handicap_completion: number
  avg_entries_won_sets: number
  sets_won: number
  sets_lost: number
  seed_position: number | null
  is_eliminated?: boolean
}

type SortKey = keyof Omit<MarranometroRow, 'player_id' | 'full_name' | 'short_name'>
type SortDir = 'asc' | 'desc'

const COLUMNS: { key: SortKey; label: string; title: string; lowerBetter?: boolean }[] = [
  { key: 'matches_played', label: 'PJ', title: 'Partidos jugados' },
  { key: 'win_pct',        label: 'PG%', title: '% Partidos ganados = PG ÷ PJ' },
  { key: 'avg_sets_won_per_match', label: 'SG/P', title: 'Sets ganados por partido = SG ÷ PJ' },
  { key: 'avg_set_diff_per_match', label: 'ΔS/P', title: 'Diferencia de sets por partido = (SG − SP) ÷ PJ' },
  { key: 'avg_handicap_completion', label: 'H%', title: '% Cumplimiento hándicap = Carambolas totales ÷ Hándicap disponible' },
  { key: 'avg_entries_won_sets', label: 'Ent.', title: 'Entradas promedio en sets ganados = Entradas_en_SG ÷ SG  (↓ menor = mejor)' , lowerBetter: true },
]

export default function MarranometroTable({ rows }: { rows: MarranometroRow[] }) {
  const [sortKey, setSortKey] = useState<SortKey>('win_pct')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      const col = COLUMNS.find(c => c.key === key)
      setSortDir(col?.lowerBetter ? 'asc' : 'desc')
    }
  }

  const sorted = [...rows].sort((a, b) => {
    const av = a[sortKey] as number
    const bv = b[sortKey] as number
    const inf = (v: number) => v === Infinity ? 9999 : v
    return sortDir === 'asc' ? inf(av) - inf(bv) : inf(bv) - inf(av)
  })

  function arrow(key: SortKey) {
    if (sortKey !== key) return <span className="text-felt-600 ml-0.5">⇅</span>
    return <span className="text-gold-400 ml-0.5">{sortDir === 'asc' ? '↑' : '↓'}</span>
  }

  function fmt(key: SortKey, val: number): string {
    if (val === Infinity || val === 9999) return '—'
    switch (key) {
      case 'win_pct':
      case 'avg_handicap_completion':
        return val > 0 ? `${(val * 100).toFixed(0)}%` : '—'
      case 'avg_sets_won_per_match':
      case 'avg_set_diff_per_match':
        return val !== 0 || true ? val.toFixed(2) : '—'
      case 'avg_entries_won_sets':
        return val > 0 && val !== Infinity ? val.toFixed(1) : '—'
      default:
        return String(val)
    }
  }

  return (
    <div className="overflow-x-auto -mx-1">
      <table className="standings-table min-w-full text-xs">
        <thead>
          <tr>
            <th className="w-8">#</th>
            <th className="text-left">Jugador</th>
            {COLUMNS.map(col => (
              <th key={col.key}
                  className="text-center cursor-pointer select-none hover:text-gold-300 transition-colors"
                  title={col.title}
                  onClick={() => handleSort(col.key)}
              >
                {col.label}{arrow(col.key)}
                {col.lowerBetter && <span className="text-felt-500 text-xs">↓</span>}
              </th>
            ))}
            <th className="text-right w-14">Siembra</th>
          </tr>
        </thead>
        <tbody>
          {(() => {
            let seedCounter = 0
            return sorted.map((r, i) => {
              const hasStoredSeed = !r.is_eliminated && r.seed_position !== null
              if (hasStoredSeed) seedCounter++
              const displaySeed = hasStoredSeed ? seedCounter : null
              return (
                <tr key={r.player_id} className={r.is_eliminated ? 'opacity-65' : ''}>
                  <td className="text-center font-bold text-ivory-300">{i + 1}</td>
                  <td>
                    <div className={cn('text-sm font-medium', r.is_eliminated ? 'line-through text-felt-300' : 'text-ivory-200')}>
                      {r.short_name ?? r.full_name}
                      {r.is_eliminated && <span className="ml-1 not-italic text-xs">🐷</span>}
                    </div>
                    <div className="text-xs text-felt-400">H: {r.handicap}</div>
                  </td>
                  {COLUMNS.map(col => (
                    <td key={col.key}
                        className={cn(
                          'text-center',
                          r.is_eliminated ? 'text-felt-500' : sortKey === col.key ? 'text-gold-300 font-semibold' : 'text-ivory-300'
                        )}
                    >
                      {fmt(col.key, r[col.key] as number)}
                    </td>
                  ))}
                  <td className="text-right">
                    {r.is_eliminated
                      ? <span className="text-felt-500 text-xs line-through">Elim.</span>
                      : displaySeed !== null
                        ? <span className="badge-gold">#{displaySeed}</span>
                        : '—'}
                  </td>
                </tr>
              )
            })
          })()}
        </tbody>
      </table>
    </div>
  )
}
