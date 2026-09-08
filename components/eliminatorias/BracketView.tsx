'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils/cn'

interface Props {
  bracket: Record<string, any[]>
  seeds: any[]
  playerMap: Map<string, any>
}

function pName(id: string | null, pm: Map<string, any>): string {
  if (!id) return '?'
  const p = pm.get(id)
  return p?.short_name ?? p?.full_name ?? '?'
}

function seedOf(id: string | null, seeds: any[]): number | null {
  if (!id) return null
  return seeds.find((s: any) => s.player_id === id)?.seed_number ?? null
}

function bySeeds(oct: any[], seeds: any[], sA: number, sB: number): any {
  const pA = seeds.find((s: any) => s.seed_number === sA)?.player_id
  const pB = seeds.find((s: any) => s.seed_number === sB)?.player_id
  if (!pA || !pB) return undefined
  return oct.find((m: any) =>
    (m.player_a_id === pA && m.player_b_id === pB) ||
    (m.player_a_id === pB && m.player_b_id === pA)
  )
}

// ── Match card ────────────────────────────────────────────────────────────────

const W = 118 // card width px

function Card({ m, seeds, pm }: { m: any; seeds: any[]; pm: Map<string, any> }) {
  const empty = !m
  const done  = m?.status === 'terminado'

  const row = (id: string | null, score: number | null) => {
    const win  = !!(m?.winner_id && m.winner_id === id)
    const lose = !!(m?.winner_id && m.winner_id !== id && id)
    const seed = seedOf(id, seeds)
    return (
      <div className={cn(
        'flex items-center gap-1 px-1.5 py-1 text-[11px] min-w-0',
        win  ? 'text-gold-400 font-bold' :
        lose ? 'text-felt-500' :
        empty? 'text-felt-700' : 'text-ivory-200',
      )}>
        {seed != null && (
          <span className={cn(
            'shrink-0 text-[9px] w-4 h-4 flex items-center justify-center rounded font-bold',
            win  ? 'bg-gold-400 text-felt-900' :
            lose ? 'bg-felt-800 text-felt-600' : 'bg-felt-700 text-ivory-300',
          )}>{seed}</span>
        )}
        <span className={cn('flex-1 truncate', lose && 'line-through')}>
          {empty ? '—' : pName(id, pm)}
        </span>
        {lose && <span className="shrink-0 text-[10px]">🐷</span>}
        {score != null && done && (
          <span className="shrink-0 font-mono font-bold ml-0.5">{score}</span>
        )}
      </div>
    )
  }

  const inner = (
    <div style={{ width: W }} className={cn(
      'rounded border overflow-hidden',
      empty
        ? 'border-felt-800/30 opacity-20'
        : 'border-felt-600 bg-felt-900/80 hover:border-gold-500/60 transition-colors cursor-pointer',
    )}>
      <div className="divide-y divide-felt-700/40">
        {row(m?.player_a_id ?? null, m?.score_a ?? null)}
        {row(m?.player_b_id ?? null, m?.score_b ?? null)}
      </div>
    </div>
  )
  if (!m) return inner
  return <Link href={`/partidos/${m.id}`}>{inner}</Link>
}

// ── SVG connectors ────────────────────────────────────────────────────────────

const CW = 12   // connector column width
const CH = 46   // card height approximation (2 rows ~22px + borders)
const MG = 5    // gap between the 2 matches in a pair
const PG = 28   // gap between pairs within a side

function Lines({ n, dir }: { n: number; dir: 'l' | 'r' }) {
  const pH = CH * 2 + MG          // height of one pair
  const total = n * pH + (n - 1) * PG
  const x1 = dir === 'l' ? 0 : CW
  const x2 = dir === 'l' ? CW : 0
  const c = '#243a24'
  return (
    <svg width={CW} height={total} style={{ flexShrink: 0, overflow: 'visible' }}>
      {Array.from({ length: n }).map((_, i) => {
        const base = i * (pH + PG)
        const y1   = base + CH / 2
        const y2   = base + CH + MG + CH / 2
        const ym   = (y1 + y2) / 2
        return (
          <g key={i}>
            <line x1={x1} y1={y1} x2={x2} y2={y1} stroke={c} strokeWidth="1.5" />
            <line x1={x1} y1={y2} x2={x2} y2={y2} stroke={c} strokeWidth="1.5" />
            <line x1={x2} y1={y1} x2={x2} y2={y2} stroke={c} strokeWidth="1.5" />
            <line x1={x2} y1={ym} x2={x1} y2={ym} stroke={c} strokeWidth="1.5" />
          </g>
        )
      })}
    </svg>
  )
}

// Horizontal line (semi → final)
function HLine() {
  return (
    <svg width={20} height={2} style={{ flexShrink: 0, alignSelf: 'center' }}>
      <line x1={0} y1={1} x2={20} y2={1} stroke="#243a24" strokeWidth="1.5" />
    </svg>
  )
}

// ── Column helpers ─────────────────────────────────────────────────────────────

function Pair({ a, b, seeds, pm }: { a: any; b: any; seeds: any[]; pm: Map<string, any> }) {
  return (
    <div className="flex flex-col" style={{ gap: MG }}>
      <Card m={a} seeds={seeds} pm={pm} />
      <Card m={b} seeds={seeds} pm={pm} />
    </div>
  )
}

// ── BracketView ───────────────────────────────────────────────────────────────

export default function BracketView({ bracket, seeds, playerMap: pm }: Props) {
  const oct = bracket.octavos   ?? []
  const qtr = bracket.cuartos   ?? []
  const sem = bracket.semifinal ?? []
  const fin = bracket.final     ?? []

  // Octavos — found by seed pair (order-independent)
  const m2  = bySeeds(oct, seeds, 2, 15)
  const m6  = bySeeds(oct, seeds, 6, 11)
  const m8  = bySeeds(oct, seeds, 8, 9)
  const m4  = bySeeds(oct, seeds, 4, 13)
  const m1  = bySeeds(oct, seeds, 1, 16)
  const m5  = bySeeds(oct, seeds, 5, 12)
  const m7  = bySeeds(oct, seeds, 7, 10)
  const m3  = bySeeds(oct, seeds, 3, 14)

  // Cuartos: [0,1] izq, [2,3] der
  const qL0 = qtr[0]; const qL1 = qtr[1]
  const qR0 = qtr[2]; const qR1 = qtr[3]

  // Semis + final
  const sL = sem[0]; const sR = sem[1]
  const f  = fin[0]

  // Vertical gap between the two pairs on each side (should center relative to semi)
  const pairGap = PG

  return (
    <div className="w-full flex justify-center">
      <div className="flex items-center" style={{ gap: 0 }}>

        {/* ── IZQ OCTAVOS ── */}
        <div className="flex flex-col" style={{ gap: pairGap }}>
          <Pair a={m2} b={m6} seeds={seeds} pm={pm} />
          <Pair a={m8} b={m4} seeds={seeds} pm={pm} />
        </div>

        <Lines n={2} dir="l" />

        {/* ── IZQ CUARTOS ── */}
        <div className="flex flex-col" style={{ gap: pairGap }}>
          <Card m={qL0} seeds={seeds} pm={pm} />
          <Card m={qL1} seeds={seeds} pm={pm} />
        </div>

        <Lines n={1} dir="l" />

        {/* ── IZQ SEMI ── */}
        <Card m={sL} seeds={seeds} pm={pm} />

        <HLine />

        {/* ── FINAL ── */}
        <div className="flex flex-col items-center gap-1">
          <span className="text-2xl leading-none">🏆</span>
          <Card m={f} seeds={seeds} pm={pm} />
        </div>

        <HLine />

        {/* ── DER SEMI ── */}
        <Card m={sR} seeds={seeds} pm={pm} />

        <Lines n={1} dir="r" />

        {/* ── DER CUARTOS ── */}
        <div className="flex flex-col" style={{ gap: pairGap }}>
          <Card m={qR0} seeds={seeds} pm={pm} />
          <Card m={qR1} seeds={seeds} pm={pm} />
        </div>

        <Lines n={2} dir="r" />

        {/* ── DER OCTAVOS ── */}
        <div className="flex flex-col" style={{ gap: pairGap }}>
          <Pair a={m1} b={m5} seeds={seeds} pm={pm} />
          <Pair a={m7} b={m3} seeds={seeds} pm={pm} />
        </div>

      </div>
    </div>
  )
}
