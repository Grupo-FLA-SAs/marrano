/**
 * Borra filas de historical_stats cuyo player_id ya no existe en la tabla players.
 * Uso: node scripts/clean-orphan-stats.mjs
 */
import { neon } from '@neondatabase/serverless'
import { readFileSync } from 'fs'

const env = readFileSync('.env.local', 'utf8')
const url = env.match(/DATABASE_URL=(.+)/)?.[1]?.trim()
if (!url) { console.error('DATABASE_URL no encontrada en .env.local'); process.exit(1) }

const sql = neon(url)

const orphans = await sql`
  SELECT hs.player_id, hs.tournament_id
  FROM historical_stats hs
  LEFT JOIN players p ON p.id = hs.player_id
  WHERE p.id IS NULL
`

if (orphans.length === 0) {
  console.log('No hay filas huérfanas en historical_stats.')
  process.exit(0)
}

console.log(`\nEncontradas ${orphans.length} filas huérfanas:`)
orphans.forEach(r => console.log(`  player_id=${r.player_id}`))

const result = await sql`
  DELETE FROM historical_stats
  WHERE player_id NOT IN (SELECT id FROM players)
`
console.log(`\n✅ Eliminadas ${orphans.length} filas. El Marranómetro debería mostrar 40 ahora.`)
