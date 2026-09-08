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
  knockout_round: string
}

interface Seed {
  player_id: string
  seed_number: number
}

interface Player {
  id: string
  full_name: string
  short_name: string | null
}

interface Props {
  bracket: Record<string, Match[]>
  seeds: Seed[]
  playerMap: Map<string, Player>
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function playerName(id: string | null, playerMap: Map<string, Player>): string {
  if (!id) return '?'
  const p = playerMap.get(id)
  return p?.short_name ?? p?.full_name ?? '?'
}

function seedNum(id: string | null, seeds: Seed[]): number | null {
  if (!id) return null
  return seeds.find(s => s.player_id === id)?.seed_number ?? null
}

// ── MatchCard ────────────────────────────────────────────────────────────────

function MatchCard({
  match, playerMap, seeds, side,
}: {
  match: Match | undefined
  playerMap: Map<string, Player>
  seeds: Seed[]
  side: 'left' | 'right' | 'center'
}) {
  const empty = !match
  const pending = !empty && match.status !== 'terminado'

  const renderPlayer = (id: string | null, score: number | null) => {
    const isWinner = match?.winner_id && match.winner_id === id
    const seed = seedNum(id, seeds)
    return (
      <div className={cn(
        'flex items-center gap-1.5 px-2 py-1 text-xs min-w-0',
        isWinner ? 'text-gold-400 font-bold' : 'text-ivory-200',
        empty && 'text-felt-600',
      )}>
        {seed != null && (
          <span className={cn(
            'shrink-0 text-[10px] w-5 h-5 flex items-center justify-center rounded font-bold',
            isWinner ? 'bg-gold-400 text-felt-900' : 'bg-felt-700 text-ivory-300',
          )}>
            {seed}
          </span>
        )}
        <span className="truncate">{empty ? '—' : playerName(id, playerMap)}</span>
        {score != null && !pending && (
          <span className="ml-auto shrink-0 font-mono font-bold">{score}</span>
        )}
      </div>
    )
  }

  const card = (
    <div className={cn(
      'w-[140px] rounded border overflow-hidden select-none',
      empty ? 'border-felt-800 opacity-30' : 'border-felt-600 bg-felt-900 hover:border-gold-500 transition-colors cursor-pointer',
    )}>
      <div className="divide-y divide-felt-700/50">
        {renderPlayer(match?.player_a_id ?? null, match?.score_a ?? null)}
        {renderPlayer(match?.player_b_id ?? null, match?.score_b ?? null)}
      </div>
    </div>
  )

  if (!match) return card
  return <Link href={`/partidos/${match.id}`}>{card}</Link>
}

// ── Bracket column helpers ────────────────────────────────────────────────────

// Renders a column of matches with equal spacing.
// `gap` is the gap (in px) between the pairs.
function MatchColumn({
  matches, playerMap, seeds, side, pairGap = 0,
}: {
  matches: (Match | undefined)[]
  playerMap: Map<string, Player>
  seeds: Seed[]
  side: 'left' | 'right' | 'center'
  pairGap?: number
}) {
  return (
    <div className="flex flex-col" style={{ gap: pairGap }}>
      {matches.map((m, i) => (
        <MatchCard key={i} match={m} playerMap={playerMap} seeds={seeds} side={side} />
      ))}
    </div>
  )
}

// Connector lines between rounds (SVG-based)
function Connectors({
  count, direction, pairGap, cardH,
}: {
  count: number       // number of pairs
  direction: 'left' | 'right'
  pairGap: number     // gap between matches in a pair (px)
  cardH: number       // height of a single match card (px)
}) {
  const lineColor = '#2d5a3d'
  const midGap = pairGap  // gap between pairs
  const pairH = cardH * 2 + 4  // 2 matches + divider ≈ 4px
  const unitH = pairH + midGap  // height of one pair + gap to next pair

  const totalH = count * pairH + (count - 1) * midGap
  const w = 18

  const lines: React.ReactNode[] = []
  for (let i = 0; i < count; i++) {
    // top match center Y
    const topY = i * unitH + cardH / 2
    // bottom match center Y (of the pair)
    const bottomY = i * unitH + cardH + 4 + cardH / 2
    const midY = (topY + bottomY) / 2

    const x1 = direction === 'left' ? 0 : w
    const x2 = direction === 'left' ? w : 0

    lines.push(
      <g key={i}>
        {/* Horizontal from top match */}
        <line x1={x1} y1={topY} x2={x2} y2={topY} stroke={lineColor} strokeWidth="1.5" />
        {/* Horizontal from bottom match */}
        <line x1={x1} y1={bottomY} x2={x2} y2={bottomY} stroke={lineColor} strokeWidth="1.5" />
        {/* Vertical connecting them */}
        <line x1={x2} y1={topY} x2={x2} y2={bottomY} stroke={lineColor} strokeWidth="1.5" />
        {/* Output line to next round */}
        <line x1={x2} y1={midY} x2={x1} y2={midY} stroke={lineColor} strokeWidth="1.5" />
      </g>
    )
  }

  return (
    <svg width={w} height={totalH} style={{ overflow: 'visible', flexShrink: 0 }}>
      {lines}
    </svg>
  )
}

// ── Main BracketView ─────────────────────────────────────────────────────────

export default function BracketView({ bracket, seeds, playerMap }: Props) {
  const oct = bracket.octavos ?? []
  const qtr = bracket.cuartos ?? []
  const sem = bracket.semifinal ?? []
  const fin = bracket.final ?? []

  // Left side: oct[0-3], qtr[0-1], sem[0]
  const leftOct = [oct[0], oct[1], oct[2], oct[3]]
  const leftQtr = [qtr[0], qtr[1]]
  const leftSem = sem[0]

  // Right side: oct[4-7], qtr[2-3], sem[1]
  const rightOct = [oct[4], oct[5], oct[6], oct[7]]
  const rightQtr = [qtr[2], qtr[3]]
  const rightSem = sem[1]

  const finalMatch = fin[0]

  // Card dimensions (approximate, must match rendered output)
  const CARD_H = 52   // px — 2 rows of ~24px + padding
  const OCT_GAP = 8   // gap between the 2 octavos in a pair
  const QTR_GAP = CARD_H * 2 + OCT_GAP + 20  // gap between the 2 cuartos
  const SEM_GAP = 0   // only 1 semi per side

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex items-center gap-0 min-w-max mx-auto w-fit">

        {/* ── LEFT OCTAVOS (pairs: top=0,1 / bottom=2,3) ── */}
        <div className="flex flex-col" style={{ gap: QTR_GAP }}>
          {/* top pair */}
          <div className="flex flex-col" style={{ gap: OCT_GAP }}>
            <MatchCard match={oct[0]} playerMap={playerMap} seeds={seeds} side="left" />
            <MatchCard match={oct[1]} playerMap={playerMap} seeds={seeds} side="left" />
          </div>
          {/* bottom pair */}
          <div className="flex flex-col" style={{ gap: OCT_GAP }}>
            <MatchCard match={oct[2]} playerMap={playerMap} seeds={seeds} side="left" />
            <MatchCard match={oct[3]} playerMap={playerMap} seeds={seeds} side="left" />
          </div>
        </div>

        {/* Left oct → qtr connectors */}
        <Connectors count={2} direction="left" pairGap={QTR_GAP} cardH={CARD_H} />

        {/* ── LEFT CUARTOS ── */}
        <div className="flex flex-col" style={{ gap: QTR_GAP }}>
          <MatchCard match={qtr[0]} playerMap={playerMap} seeds={seeds} side="left" />
          <MatchCard match={qtr[1]} playerMap={playerMap} seeds={seeds} side="left" />
        </div>

        {/* Left qtr → semi connectors */}
        <Connectors count={1} direction="left" pairGap={0} cardH={CARD_H} />

        {/* ── LEFT SEMI ── */}
        <MatchCard match={leftSem} playerMap={playerMap} seeds={seeds} side="left" />

        {/* Left semi → final line */}
        <div style={{ width: 28, alignSelf: 'center' }}>
          <svg width={28} height={2}>
            <line x1={0} y1={1} x2={28} y2={1} stroke="#2d5a3d" strokeWidth="1.5" />
          </svg>
        </div>

        {/* ── FINAL + TROPHY ── */}
        <div className="flex flex-col items-center gap-3">
          <div className="text-3xl">🏆</div>
          <MatchCard match={finalMatch} playerMap={playerMap} seeds={seeds} side="center" />
        </div>

        {/* Right semi → final line */}
        <div style={{ width: 28, alignSelf: 'center' }}>
          <svg width={28} height={2}>
            <line x1={0} y1={1} x2={28} y2={1} stroke="#2d5a3d" strokeWidth="1.5" />
          </svg>
        </div>

        {/* ── RIGHT SEMI ── */}
        <MatchCard match={rightSem} playerMap={playerMap} seeds={seeds} side="right" />

        {/* Right qtr → semi connectors */}
        <Connectors count={1} direction="right" pairGap={0} cardH={CARD_H} />

        {/* ── RIGHT CUARTOS ── */}
        <div className="flex flex-col" style={{ gap: QTR_GAP }}>
          <MatchCard match={qtr[2]} playerMap={playerMap} seeds={seeds} side="right" />
          <MatchCard match={qtr[3]} playerMap={playerMap} seeds={seeds} side="right" />
        </div>

        {/* Right oct → qtr connectors */}
        <Connectors count={2} direction="right" pairGap={QTR_GAP} cardH={CARD_H} />

        {/* ── RIGHT OCTAVOS ── */}
        <div className="flex flex-col" style={{ gap: QTR_GAP }}>
          <div className="flex flex-col" style={{ gap: OCT_GAP }}>
            <MatchCard match={oct[4]} playerMap={playerMap} seeds={seeds} side="right" />
            <MatchCard match={oct[5]} playerMap={playerMap} seeds={seeds} side="right" />
          </div>
          <div className="flex flex-col" style={{ gap: OCT_GAP }}>
            <MatchCard match={oct[6]} playerMap={playerMap} seeds={seeds} side="right" />
            <MatchCard match={oct[7]} playerMap={playerMap} seeds={seeds} side="right" />
          </div>
        </div>

      </div>
    </div>
  )
}
