import { readFileSync } from 'fs'
import { neon } from '@neondatabase/serverless'

// Leer .env.local
const env = readFileSync('.env.local', 'utf8')
for (const line of env.split('\n')) {
  const [key, ...rest] = line.split('=')
  if (key && rest.length) process.env[key.trim()] = rest.join('=').trim()
}

const sql = neon(process.env.DATABASE_URL)

const schema = readFileSync('./supabase/migrations/001_schema.sql', 'utf8')

// Dividir por ; respetando bloques DO $$ ... $$
const statements = []
let current = ''
let inDollarBlock = false

for (const line of schema.split('\n')) {
  const trimmed = line.trim()
  // Ignorar líneas solo de comentario
  if (trimmed.startsWith('--')) continue

  if (line.includes('$$')) inDollarBlock = !inDollarBlock
  current += line + '\n'

  if (!inDollarBlock && trimmed.endsWith(';')) {
    const stmt = current.trim()
    if (stmt) statements.push(stmt)
    current = ''
  }
}

console.log(`Ejecutando ${statements.length} sentencias...`)

for (let i = 0; i < statements.length; i++) {
  const stmt = statements[i]
  try {
    await sql([stmt])
    process.stdout.write('.')
  } catch (e) {
    if (e.message?.includes('already exists')) {
      process.stdout.write('s')
    } else {
      console.error(`\nError en sentencia ${i + 1}:`, e.message)
      console.error(stmt.slice(0, 120))
    }
  }
}

console.log('\n✓ Listo.')
