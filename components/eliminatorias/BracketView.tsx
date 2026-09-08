'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils/cn'

interface Match {
  id: string
  player_a_id: string | null
  player_b_id: string | null
  winner_id: string | null
  score_a: number | null
  score_b: number | null
  status: string
  knockout_round: string | null
}

interface Props {
  bracket: Record<string, any[]>
  seeds: any[]
  playerMap: Map<string, any>
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function pName(id: string | null, pm: Map<string, any>): string {
  if (!id) return '?'
  const p = pm.get(id)
  return p?.short_name ?? p?.full_name ?? '?'
}

function seedOf(id: string | null, seeds: any[]): number | null {
  if (!id) return null
  return seeds.find((s: any) => s.player_id === id)?.seed_number ?? null
}

/** Finds the octavos match that contains both seeds */
function matchBySeedPair(oct: any[], seeds: any[], sA: number, sB: number): Match | undefined {
  const pA = seeds.find((s: any) => s.seed_number === sA)?.player_id
  const pB = seeds.find((s: any) => s.seed_number === sB)?.player_id
  if (!pA || !pB) return undefined
  return oct.find((m: any) =>
    (m.player_a_id === pA && m.player_b_id === pB) ||
    (m.player_a_id === pB && m.player_b_id === pA)
  )
}

// ── MatchCard ─────────────────────────────────────────────────────────────────

function MatchCard({ match, seeds, playerMap }: {
  match: Match | undefined
  seeds: any[]
  playerMap: Map<string, any>
}) {
  const empty = !match
  const pending = !empty && match.status !== 'terminado'

  const row = (id: string | null, score: number | null) => {
    const isWinner = !!(match?.winner_id && match.winner_id === id)
    const isLoser  = !!(match?.winner_id && match.winner_id !== id && id)
    const seed     = seedOf(id, seeds)

    return (
      <div className={cn(
        'flex items-center gap-1.5 px-2 py-1.5 text-xs min-w-0',
        isWinner ? 'text-gold-400 font-bold' :
        isLoser  ? 'text-felt-500' :
        empty    ? 'text-felt-700' : 'text-ivory-200',
      )}>
        {seed != null && (
          <span className={cn(
            'shrink-0 text-[10px] w-5 h-5 flex items-center justify-center rounded font-bold',
            isWinner ? 'bg-gold-400 text-felt-900' :
            isLoser  ? 'bg-felt-800 text-felt-600' : 'bg-felt-700 text-ivory-300',
          )}>
            {seed}
          </span>
        )}
        <span className={cn('flex-1 leading-tight', isLoser && 'line-through')}>
          {empty ? '—' : pName(id, playerMap)}
        </span>
        {isLoser && <span className="shrink-0">🐷</span>}
        {score != null && !pending && (
          <span className="shrink-0 font-mono font-bold ml-1">{score}</span>
        )}
      </div>
    )
  }

  const inner = (
    <div className={cn(
      'w-44 rounded border overflow-hidden',
      empty
        ? 'border-felt-800/40 opacity-25'
        : 'border-felt-600 bg-felt-900/80 hover:border-gold-500/70 transition-colors cursor-pointer',
    )}>
      <div className="divide-y divide-felt-700/40">
        {row(match?.player_a_id ?? null, match?.score_a ?? null)}
        {row(match?.player_b_id ?? null, match?.score_b ?? null)}
      </div>
    </div>
  )

  if (!match) return inner
  return <Link href={`/partidos/${match.id}`}>{inner}</Link>
}

// ── Connecting lines (SVG) ────────────────────────────────────────────────────

function Lines({
  pairs, direction, pairGap, cardH,
}: {
  pairs: number
  direction: 'left' | 'right'
  pairGap: number
  cardH: number
}) {
  const stroke = '#2a4a2a'
  const matchGap = 6
  const pairH = cardH * 2 + matchGap
  const totalH = pairs * pairH + (pairs - 1) * pairGap
  const w = 16

  const x1 = direction === 'left' ? 0 : w
  const x2 = direction === 'left' ? w : 0

  return (
    <svg width={w} height={totalH} style={{ overflow: 'visible', flexShrink: 0 }}>
      {Array.from({ length: pairs }).map((_, i) => {
        const base = i * (pairH + pairGap)
        const topY = base + cardH / 2
        const botY = base + cardH + matchGap + cardH / 2
        const midY = (topY + botY) / 2
        return (
          <g key={i}>
            <line x1={x1} y1={topY} x2={x2} y2={topY} stroke={stroke} strokeWidth="1.5" />
            <line x1={x1} y1={botY} x2={x2} y2={botY} stroke={stroke} strokeWidth="1.5" />
            <line x1={x2} y1={topY} x2={x2} y2={botY} stroke={stroke} strokeWidth="1.5" />
            <line x1={x2} y1={midY} x2={x1} y2={midY} stroke={stroke} strokeWidth="1.5" />
          </g>
        )
      })}
    </svg>
  )
}

// ── Column helpers ────────────────────────────────────────────────────────────

function PairCol({
  top, bottom, seeds, playerMap, gap,
}: {
  top: Match | undefined
  bottom: Match | undefined
  seeds: any[]
  playerMap: Map<string, any>
  gap: number
}) {
  return (
    <div className="flex flex-col" style={{ gap }}>
      <MatchCard match={top} seeds={seeds} playerMap={playerMap} />
      <MatchCard match={bottom} seeds={seeds} playerMap={playerMap} />
    </div>
  )
}

// ── BracketView ───────────────────────────────────────────────────────────────

export default function BracketView({ bracket, seeds, playerMap }: Props) {
  const oct = bracket.octavos   ?? []
  const qtr = bracket.cuartos   ?? []
  const sem = bracket.semifinal ?? []
  const fin = bracket.final     ?? []

  // Look up octavos matches by seed pair — works regardless of DB order
  const m1v16  = matchBySeedPair(oct, seeds, 1, 16)
  const m8v9   = matchBySeedPair(oct, seeds, 8, 9)
  const m5v12  = matchBySeedPair(oct, seeds, 5, 12)
  const m4v13  = matchBySeedPair(oct, seeds, 4, 13)
  const m2v15  = matchBySeedPair(oct, seeds, 2, 15)
  const m7v10  = matchBySeedPair(oct, seeds, 7, 10)
  const m6v11  = matchBySeedPair(oct, seeds, 6, 11)
  const m3v14  = matchBySeedPair(oct, seeds, 3, 14)

  // Cuartos: [0,1] = left, [2,3] = right (by DB insertion order)
  const qL0 = qtr[0] as Match | undefined
  const qL1 = qtr[1] as Match | undefined
  const qR0 = qtr[2] as Match | undefined
  const qR1 = qtr[3] as Match | undefined

  // Semis
  const sL = sem[0] as Match | undefined
  const sR = sem[1] as Match | undefined

  // Final
  const finalMatch = fin[0] as Match | undefined

  const CARD_H   = 56   // px — two rows of ~26px
  const PAIR_GAP = 8    // gap between the 2 matches in a pair
  const COL_GAP  = CARD_H * 2 + PAIR_GAP + 24  // gap between the two pairs in a side

  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex items-center min-w-max mx-auto w-fit">

        {/* ── LEFT OCTAVOS ── */}
        <div className="flex flex-col" style={{ gap: COL_GAP }}>
          <PairCol top={m1v16} bottom={m8v9}  seeds={seeds} playerMap={playerMap} gap={PAIR_GAP} />
          <PairCol top={m5v12} bottom={m4v13} seeds={seeds} playerMap={playerMap} gap={PAIR_GAP} />
        </div>

        <Lines pairs={2} direction="left" pairGap={COL_GAP} cardH={CARD_H} />

        {/* ── LEFT CUARTOS ── */}
        <div className="flex flex-col" style={{ gap: COL_GAP }}>
          <MatchCard match={qL0} seeds={seeds} playerMap={playerMap} />
          <MatchCard match={qL1} seeds={seeds} playerMap={playerMap} />
        </div>

        <Lines pairs={1} direction="left" pairGap={0} cardH={CARD_H} />

        {/* ── LEFT SEMI ── */}
        <MatchCard match={sL} seeds={seeds} playerMap={playerMap} />

        {/* Center line to final */}
        <svg width={28} height={2} style={{ flexShrink: 0, alignSelf: 'center' }}>
          <line x1={0} y1={1} x2={28} y2={1} stroke="#2a4a2a" strokeWidth="1.5" />
        </svg>

        {/* ── FINAL ── */}
        <div className="flex flex-col items-center gap-2">
          <span className="text-3xl">🏆</span>
          <MatchCard match={finalMatch} seeds={seeds} playerMap={playerMap} />
        </div>

        {/* Center line to final */}
        <svg width={28} height={2} style={{ flexShrink: 0, alignSelf: 'center' }}>
          <line x1={0} y1={1} x2={28} y2={1} stroke="#2a4a2a" strokeWidth="1.5" />
        </svg>

        {/* ── RIGHT SEMI ── */}
        <MatchCard match={sR} seeds={seeds} playerMap={playerMap} />

        <Lines pairs={1} direction="right" pairGap={0} cardH={CARD_H} />

        {/* ── RIGHT CUARTOS ── */}
        <div className="flex flex-col" style={{ gap: COL_GAP }}>
          <MatchCard match={qR0} seeds={seeds} playerMap={playerMap} />
          <MatchCard match={qR1} seeds={seeds} playerMap={playerMap} />
        </div>

        <Lines pairs={2} direction="right" pairGap={COL_GAP} cardH={CARD_H} />

        {/* ── RIGHT OCTAVOS ── */}
        <div className="flex flex-col" style={{ gap: COL_GAP }}>
          <PairCol top={m2v15} bottom={m7v10} seeds={seeds} playerMap={playerMap} gap={PAIR_GAP} />
          <PairCol top={m6v11} bottom={m3v14} seeds={seeds} playerMap={playerMap} gap={PAIR_GAP} />
        </div>

      </div>
    </div>
  )
}
