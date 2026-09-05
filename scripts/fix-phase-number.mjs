import { neon } from '@neondatabase/serverless'
import { readFileSync } from 'fs'

const env = readFileSync('.env.local', 'utf8')
for (const line of env.split('\n')) {
  const [k, ...v] = line.split('=')
  if (k && v.length) process.env[k.trim()] = v.join('=').trim()
}

const sql = neon(process.env.DATABASE_URL)

await sql`UPDATE phases SET phase_number = 2 WHERE status = 'activa'`
console.log('✓ phase_number corregido a 2')
