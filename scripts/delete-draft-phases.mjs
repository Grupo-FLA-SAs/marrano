import { neon } from '@neondatabase/serverless'
import { readFileSync } from 'fs'

// Leer .env.local manualmente
const env = readFileSync('.env.local', 'utf8')
for (const line of env.split('\n')) {
  const [k, ...v] = line.split('=')
  if (k && v.length) process.env[k.trim()] = v.join('=').trim()
}

const sql = neon(process.env.DATABASE_URL)

// Lista las fases en borrador
const drafts = await sql`
  SELECT id, name, phase_number, status, created_at
  FROM phases
  WHERE status = 'borrador'
  ORDER BY created_at
`

console.log('Fases no finalizadas:')
drafts.forEach(p => console.log(`  ${p.phase_number}. ${p.name} [${p.status}] — ${p.id}`))

if (drafts.length === 0) {
  console.log('No hay fases para eliminar.')
  process.exit(0)
}

for (const phase of drafts) {
  await sql`DELETE FROM phases WHERE id = ${phase.id}`
  console.log(`✓ Eliminada: ${phase.name} (${phase.id})`)
}

console.log('\nListo. Vuelve a crear la Fase 2.')
