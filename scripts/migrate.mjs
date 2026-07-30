import { readFileSync } from 'fs'
import { neon } from '@neondatabase/serverless'

// Leer .env.local manualmente
const env = readFileSync('.env.local', 'utf8')
for (const line of env.split('\n')) {
  const [key, ...rest] = line.split('=')
  if (key && rest.length) process.env[key.trim()] = rest.join('=').trim()
}

const sql = neon(process.env.DATABASE_URL)

await sql`
  CREATE TABLE IF NOT EXISTS organizers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )
`

await sql`
  CREATE INDEX IF NOT EXISTS idx_organizers_email ON organizers(email)
`

console.log('✓ Tabla organizers creada.')
