import { readFileSync } from 'fs'
import { neon } from '@neondatabase/serverless'
import { createHash } from 'crypto'

// Leer .env.local manualmente
const env = readFileSync('.env.local', 'utf8')
for (const line of env.split('\n')) {
  const [key, ...rest] = line.split('=')
  if (key && rest.length) process.env[key.trim()] = rest.join('=').trim()
}

// Datos del organizador — cambia estos valores
const EMAIL = 'Rodiaz1904@gmail.com'
const PASSWORD = 'AntoGordo19$'
const NAME = 'Jorge'

// Hash simple con crypto nativo (sin bcrypt para evitar dependencias)
// Usamos SHA-256 con salt fijo — suficiente para un proyecto local
import bcryptjs from 'bcryptjs'
const hash = await bcryptjs.hash(PASSWORD, 12)

const sql = neon(process.env.DATABASE_URL)

await sql`
  INSERT INTO organizers (email, password_hash, name)
  VALUES (${EMAIL}, ${hash}, ${NAME})
  ON CONFLICT (email) DO UPDATE SET password_hash = ${hash}, name = ${NAME}
`

console.log('✓ Organizador creado:', EMAIL)
