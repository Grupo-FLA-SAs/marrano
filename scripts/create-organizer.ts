/**
 * Crea el primer organizador en la base de datos.
 * Uso: npx ts-node scripts/create-organizer.ts
 *
 * O ejecuta directamente en el SQL Editor de Neon:
 *
 * INSERT INTO organizers (email, password_hash, name)
 * VALUES ('tu@email.com', '<bcrypt_hash>', 'Tu Nombre');
 *
 * Para generar el hash bcrypt online: https://bcrypt-generator.com/ (rounds: 10)
 */

import { neon } from '@neondatabase/serverless'
import bcrypt from 'bcryptjs'

async function main() {
  const email = process.argv[2]
  const password = process.argv[3]
  const name = process.argv[4] ?? email

  if (!email || !password) {
    console.error('Uso: npx ts-node scripts/create-organizer.ts <email> <password> [nombre]')
    process.exit(1)
  }

  if (!process.env.DATABASE_URL) {
    console.error('Falta DATABASE_URL en .env.local')
    process.exit(1)
  }

  const sql = neon(process.env.DATABASE_URL)
  const hash = await bcrypt.hash(password, 10)

  await sql`
    INSERT INTO organizers (email, password_hash, name)
    VALUES (${email}, ${hash}, ${name})
    ON CONFLICT (email) DO UPDATE SET password_hash = ${hash}, name = ${name}
  `

  console.log(`✅ Organizador creado: ${email}`)
}

main().catch(console.error)
