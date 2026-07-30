import { readFileSync } from 'fs'
import { neon } from '@neondatabase/serverless'

const env = readFileSync('.env.local', 'utf8')
for (const line of env.split('\n')) {
  const [key, ...rest] = line.split('=')
  if (key && rest.length) process.env[key.trim()] = rest.join('=').trim()
}

const sql = neon(process.env.DATABASE_URL)

// Borrar todo lo relacionado con fases (cascada borra grupos, miembros y partidos)
await sql`DELETE FROM phases`
await sql`DELETE FROM matches`  // por si quedaron huérfanos

console.log('✓ Fases y partidos borrados. Puedes crear la fase de nuevo.')
