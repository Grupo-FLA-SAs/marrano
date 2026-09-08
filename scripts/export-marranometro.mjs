import { neon } from '@neondatabase/serverless'
import { readFileSync, writeFileSync } from 'fs'

const env = readFileSync('.env.local', 'utf8')
for (const line of env.split('\n')) {
  const [k, ...v] = line.split('=')
  if (k && v.length) process.env[k.trim()] = v.join('=').trim()
}

const sql = neon(process.env.DATABASE_URL)

// Obtener torneo activo
const [tournament] = await sql`SELECT * FROM tournaments WHERE status = 'en_curso' LIMIT 1`
if (!tournament) { console.error('No hay torneo activo'); process.exit(1) }

// Stats históricas
const stats = await sql`SELECT * FROM historical_stats WHERE tournament_id = ${tournament.id}`

// Jugadores
const players = await sql`SELECT * FROM players WHERE tournament_id = ${tournament.id} AND status = 'activo'`

// Clasificados de última fase finalizada
const lastPhaseQualified = await sql`
  SELECT pq.player_id FROM phase_qualifications pq
  JOIN phases ph ON ph.id = pq.phase_id
  WHERE pq.tournament_id = ${tournament.id}
    AND pq.status = 'clasificado'
    AND ph.status = 'finalizada'
    AND ph.phase_number = (
      SELECT MAX(phase_number) FROM phases
      WHERE tournament_id = ${tournament.id} AND status = 'finalizada'
    )
`
const qualifiedIds = new Set(lastPhaseQualified.map(q => q.player_id))

// Eliminados (cualquier fase)
const eliminated = await sql`
  SELECT DISTINCT player_id FROM phase_qualifications
  WHERE tournament_id = ${tournament.id} AND status = 'eliminado'
`
const eliminatedIds = new Set(eliminated.map(e => e.player_id))

// Construir ranking
const statsMap = new Map(stats.map(s => [s.player_id, s]))

const ranked = players.map(p => {
  const s = statsMap.get(p.id) ?? { matches_played: 0, matches_won: 0, sets_won: 0, sets_lost: 0, total_carambolas: 0, total_handicap_available: 0, entries_in_won_sets: 0 }
  const pj = s.matches_played
  const win_pct = pj > 0 ? s.matches_won / pj : 0
  const sg_p = pj > 0 ? s.sets_won / pj : 0
  const ds_p = pj > 0 ? (s.sets_won - s.sets_lost) / pj : 0
  const hpct = s.total_handicap_available > 0 ? s.total_carambolas / s.total_handicap_available : 0
  const ent = s.sets_won > 0 ? s.entries_in_won_sets / s.sets_won : 9999
  return { player: p, pj, win_pct, sg_p, ds_p, hpct, ent, is_eliminated: eliminatedIds.has(p.id), is_qualified: qualifiedIds.has(p.id) }
}).sort((a, b) => {
  if (b.win_pct !== a.win_pct) return b.win_pct - a.win_pct
  if (b.sg_p !== a.sg_p) return b.sg_p - a.sg_p
  if (b.ds_p !== a.ds_p) return b.ds_p - a.ds_p
  if (b.hpct !== a.hpct) return b.hpct - a.hpct
  if (a.ent !== b.ent) return a.ent - b.ent
  return a.player.id.localeCompare(b.player.id)
})

// Asignar semillas consecutivas
let seedCounter = 0
const rows = ranked.map((r, i) => {
  const hasSeed = !r.is_eliminated && qualifiedIds.size > 0 && r.is_qualified
  if (hasSeed) seedCounter++
  return { ...r, position: i + 1, seed: hasSeed ? seedCounter : null }
})

// Serializar a JSON para pasarlo a Python
writeFileSync('scripts/marranometro_data.json', JSON.stringify({ tournament, rows }, null, 2))
console.log(`✓ Datos exportados: ${rows.length} jugadores`)
