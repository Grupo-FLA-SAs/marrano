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

// ── Card ──────────────────────────────────────────────────────────────────────

const W = 132

function Card({ m, seeds, pm }: { m: any; seeds: any[]; pm: Map<string, any> }) {
  const empty = !m
  const done  = m?.status === 'terminado'

  const row = (id: string | null, score: number | null) => {
    const win  = !!(m?.winner_id && m.winner_id === id)
    const lose = !!(m?.winner_id && m.winner_id !== id && id)
    const seed = seedOf(id, seeds)
    return (
      <div className={cn(
        'flex items-start gap-1 px-1.5 py-1 text-[11px]',
        win  ? 'text-gold-400 font-bold' :
        lose ? 'text-felt-500' :
        empty? 'text-felt-700' : 'text-ivory-200',
      )}>
        {seed != null ? (
          <span className={cn(
            'shrink-0 text-[9px] w-4 h-4 flex items-center justify-center rounded font-bold mt-px',
            win  ? 'bg-gold-400 text-felt-900' :
            lose ? 'bg-felt-800 text-felt-600' : 'bg-felt-700 text-ivory-300',
          )}>{seed}</span>
        ) : <span className="w-4 shrink-0" />}
        <span className={cn('flex-1 leading-tight break-words', lose && 'line-through')}>
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

// ── Connectors ────────────────────────────────────────────────────────────────

const CW  = 12  // connector width
const CH  = 52  // card height (2 rows, names can wrap 1 line)
const MG  = 4   // gap between 2 matches in a pair
const PG  = 24  // gap between the 2 pairs on a side

function Lines({ n, dir }: { n: number; dir: 'l' | 'r' }) {
  const pH    = CH * 2 + MG
  const total = n * pH + (n - 1) * PG
  const x1    = dir === 'l' ? 0 : CW
  const x2    = dir === 'l' ? CW : 0
  const c     = '#2a4a2a'
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

function HLine() {
  return (
    <svg width={18} height={2} style={{ flexShrink: 0, alignSelf: 'center' }}>
      <line x1={0} y1={1} x2={18} y2={1} stroke="#2a4a2a" strokeWidth="1.5" />
    </svg>
  )
}

function Pair({ a, b, seeds, pm }: { a: any; b: any; seeds: any[]; pm: Map<string, any> }) {
  return (
    <div className="flex flex-col" style={{ gap: MG }}>
      <Card m={a} seeds={seeds} pm={pm} />
      <Card m={b} seeds={seeds} pm={pm} />
    </div>
  )
}

// ── BracketView ───────────────────────────────────────────────────────────────
// Layout (izq → der):
//   IZQUIERDA: seed1(TL) 5 / seed3(BL) 7   → cuartos[2,3]  → semi[1]
//   DERECHA:   seed2(TR) 6 / seed4(BR) 8   → cuartos[0,1]  → semi[0]
// (seed 1 y 2 se pueden ver solo en la final)

export default function BracketView({ bracket, seeds, playerMap: pm }: Props) {
  const oct = bracket.octavos   ?? []
  const qtr = bracket.cuartos   ?? []
  const sem = bracket.semifinal ?? []
  const fin = bracket.final     ?? []

  // Octavos — lookup por par de semillas (independiente del orden en DB)
  const m1 = bySeeds(oct, seeds, 1, 16)
  const m5 = bySeeds(oct, seeds, 5, 12)
  const m7 = bySeeds(oct, seeds, 7, 10)
  const m3 = bySeeds(oct, seeds, 3, 14)

  const m2 = bySeeds(oct, seeds, 2, 15)
  const m6 = bySeeds(oct, seeds, 6, 11)
  const m8 = bySeeds(oct, seeds, 8, 9)
  const m4 = bySeeds(oct, seeds, 4, 13)

  // Cuartos: [0,1] = grupo 2/4/6/8; [2,3] = grupo 1/3/5/7
  const qL0 = qtr[2]; const qL1 = qtr[3]   // izq (seed 1 side)
  const qR0 = qtr[0]; const qR1 = qtr[1]   // der (seed 2 side)

  const sL = sem[1]; const sR = sem[0]
  const f  = fin[0]

  return (
    <div className="w-full flex justify-center py-2">
      <div className="flex items-center" style={{ gap: 0 }}>

        {/* ── IZQ OCTAVOS (seed 1 TL, seed 3 BL) ── */}
        <div className="flex flex-col" style={{ gap: PG }}>
          <Pair a={m1} b={m5} seeds={seeds} pm={pm} />
          <Pair a={m7} b={m3} seeds={seeds} pm={pm} />
        </div>

        <Lines n={2} dir="l" />

        {/* ── IZQ CUARTOS ── */}
        <div className="flex flex-col" style={{ gap: PG }}>
          <Card m={qL0} seeds={seeds} pm={pm} />
          <Card m={qL1} seeds={seeds} pm={pm} />
        </div>

        <Lines n={1} dir="l" />

        {/* ── IZQ SEMI ── */}
        <Card m={sL} seeds={seeds} pm={pm} />

        <HLine />

        {/* ── FINAL ── */}
        <div className="flex flex-col items-center gap-1">
          <span className="text-xl leading-none">🏆</span>
          <Card m={f} seeds={seeds} pm={pm} />
        </div>

        <HLine />

        {/* ── DER SEMI ── */}
        <Card m={sR} seeds={seeds} pm={pm} />

        <Lines n={1} dir="r" />

        {/* ── DER CUARTOS ── */}
        <div className="flex flex-col" style={{ gap: PG }}>
          <Card m={qR0} seeds={seeds} pm={pm} />
          <Card m={qR1} seeds={seeds} pm={pm} />
        </div>

        <Lines n={2} dir="r" />

        {/* ── DER OCTAVOS (seed 2 TR, seed 4 BR) ── */}
        <div className="flex flex-col" style={{ gap: PG }}>
          <Pair a={m2} b={m6} seeds={seeds} pm={pm} />
          <Pair a={m8} b={m4} seeds={seeds} pm={pm} />
        </div>

      </div>
    </div>
  )
}
