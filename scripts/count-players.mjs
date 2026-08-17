import { neon } from '@neondatabase/serverless'
import { readFileSync } from 'fs'

const url = readFileSync('.env.local', 'utf8').match(/DATABASE_URL=(.+)/)?.[1]?.trim()
const sql = neon(url)

const [total] = await sql`SELECT COUNT(*) as c FROM players`
console.log('Total jugadores en BD:', total.c)

const players = await sql`SELECT full_name FROM players ORDER BY full_name`
players.forEach((p, i) => console.log(`  ${i+1}. ${p.full_name}`))
