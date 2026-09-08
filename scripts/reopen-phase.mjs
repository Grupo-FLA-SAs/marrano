import { neon } from '@neondatabase/serverless'
import { readFileSync } from 'fs'

const env = readFileSync('.env.local', 'utf8')
for (const line of env.split('\n')) {
  const [k, ...v] = line.split('=')
  if (k && v.length) process.env[k.trim()] = v.join('=').trim()
}

const sql = neon(process.env.DATABASE_URL)

// Ver qué fases activas/finalizadas existen (excluye Fase 1)
const phases = await sql`
  SELECT id, name, phase_number, status
  FROM phases
  WHERE phase_number > 1
  ORDER BY phase_number
`
console.log('Fases disponibles:')
phases.forEach(p => console.log(`  ${p.phase_number}. ${p.name} [${p.status}] — ${p.id}`))

// Reabre la última fase no-primera que esté finalizada
const target = phases.find(p => p.status === 'finalizada')
if (!target) {
  console.log('\nNo hay fases finalizadas para reabrir (además de Fase 1).')
  process.exit(0)
}

console.log(`\nReabriendo: ${target.name} (${target.id})`)

// 1. Borrar phase_qualifications de esa fase
const deleted = await sql`
  DELETE FROM phase_qualifications WHERE phase_id = ${target.id}
  RETURNING id
`
console.log(`✓ Eliminadas ${deleted.length} clasificaciones`)

// 2. Volver el status a activa
await sql`UPDATE phases SET status = 'activa' WHERE id = ${target.id}`
console.log(`✓ Fase vuelta a estado 'activa'`)

// 3. Borrar eliminatorias (knockout_seeds y knockout_matches si existen)
const deletedSeeds = await sql`
  DELETE FROM knockout_seeds WHERE tournament_id = (
    SELECT tournament_id FROM phases WHERE id = ${target.id}
  ) RETURNING id
`
console.log(`✓ Eliminadas ${deletedSeeds.length} siembras de eliminatoria`)

const deletedKO = await sql`
  DELETE FROM matches WHERE tournament_id = (
    SELECT tournament_id FROM phases WHERE id = ${target.id}
  ) AND knockout_round IS NOT NULL RETURNING id
`
console.log(`✓ Eliminados ${deletedKO.length} partidos de eliminatoria`)

console.log('\nListo. Los partidos de grupos y resultados están intactos.')
