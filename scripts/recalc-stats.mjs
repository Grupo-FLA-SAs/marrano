/**
 * Recalcula historical_stats desde cero.
 * Borra los registros del torneo activo y re-ejecuta update_historical_stats
 * para cada partido terminado.
 *
 * Uso: node scripts/recalc-stats.mjs
 */
import { neon } from '@neondatabase/serverless'
import { readFileSync } from 'fs'

const env = readFileSync('.env.local', 'utf8')
const url = env.match(/DATABASE_URL=(.+)/)?.[1]?.trim()
if (!url) { console.error('DATABASE_URL no encontrada en .env.local'); process.exit(1) }

const sql = neon(url)

// Torneo activo
const [tournament] = await sql`
  SELECT id, name FROM tournaments
  WHERE status IN ('configuracion','en_curso')
  ORDER BY created_at DESC LIMIT 1
`
if (!tournament) { console.error('No hay torneo activo'); process.exit(1) }
console.log(`\nTorneo: ${tournament.name} (${tournament.id})`)

// Borrar stats actuales
await sql`DELETE FROM historical_stats WHERE tournament_id = ${tournament.id}`
console.log('✓ Stats anteriores borradas')

// Partidos terminados
const matches = await sql`
  SELECT id, player_a_id, player_b_id FROM matches
  WHERE tournament_id = ${tournament.id} AND status = 'terminado'
  ORDER BY updated_at
`
console.log(`\nRecalculando stats para ${matches.length} partidos terminados...\n`)

let ok = 0, fail = 0
for (const m of matches) {
  try {
    await sql`SELECT update_historical_stats(${m.id}::uuid)`
    console.log(`  ✓ Partido ${m.id}`)
    ok++
  } catch (e) {
    console.error(`  ✗ Partido ${m.id}: ${e.message}`)
    fail++
  }
}

console.log(`\nListo: ${ok} ok, ${fail} errores`)

// Verificar resultado
const stats = await sql`
  SELECT p.full_name, hs.matches_played, hs.matches_won, hs.sets_won, hs.sets_lost
  FROM historical_stats hs
  JOIN players p ON p.id = hs.player_id
  WHERE hs.tournament_id = ${tournament.id}
  ORDER BY hs.matches_played DESC, p.full_name
`
console.log('\nResumen final:')
stats.forEach(s => {
  console.log(`  ${s.full_name.padEnd(25)} PJ=${s.matches_played}  PG=${s.matches_won}  SG=${s.sets_won}  SP=${s.sets_lost}`)
})
