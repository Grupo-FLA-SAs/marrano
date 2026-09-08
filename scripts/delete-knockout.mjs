import { neon } from '@neondatabase/serverless'
import { readFileSync } from 'fs'

const env = readFileSync('.env.local', 'utf8')
for (const line of env.split('\n')) {
  const [k, ...v] = line.split('=')
  if (k && v.length) process.env[k.trim()] = v.join('=').trim()
}

const sql = neon(process.env.DATABASE_URL)

// Ver qué hay
const seeds = await sql`SELECT COUNT(*) as cnt FROM knockout_seeds`
const koMatches = await sql`SELECT COUNT(*) as cnt FROM matches WHERE knockout_round IS NOT NULL`
console.log(`Seeds actuales: ${seeds[0].cnt}`)
console.log(`Partidos knockout actuales: ${koMatches[0].cnt}`)

// Borrar todo el bracket
const d1 = await sql`DELETE FROM match_sets WHERE match_id IN (SELECT id FROM matches WHERE knockout_round IS NOT NULL) RETURNING id`
console.log(`✓ Sets de knockout borrados: ${d1.length}`)

const d2 = await sql`DELETE FROM matches WHERE knockout_round IS NOT NULL RETURNING id`
console.log(`✓ Partidos knockout borrados: ${d2.length}`)

const d3 = await sql`DELETE FROM knockout_seeds RETURNING id`
console.log(`✓ Seeds borrados: ${d3.length}`)

console.log('\nBracket eliminado. Puedes volver a generarlo correctamente.')
