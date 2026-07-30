import { neon } from '@neondatabase/serverless'
import { readFileSync } from 'fs'

const env = readFileSync('.env.local', 'utf8')
const url = env.match(/DATABASE_URL=(.+)/)?.[1]?.trim()
if (!url) { console.error('No DATABASE_URL'); process.exit(1) }

const sql = neon(url)
const content = readFileSync('supabase/migrations/003_functions.sql', 'utf8')

// Parser que entiende bloques $$ correctamente
function splitStatements(text) {
  const stmts = []
  let current = ''
  let i = 0
  let inDollar = false

  while (i < text.length) {
    if (text[i] === '$' && text[i + 1] === '$') {
      inDollar = !inDollar
      current += '$$'
      i += 2
    } else if (text[i] === ';' && !inDollar) {
      current += ';'
      const stmt = current.trim()
      if (stmt && stmt !== ';') {
        // Quitar líneas de comentario del inicio para clasificar el stmt
        const noComments = stmt.split('\n').filter(l => !l.trim().startsWith('--')).join('\n').trim()
        // Saltar GRANTs (roles de Supabase no existen en Neon) y vacíos
        if (noComments && !noComments.match(/^GRANT /i)) {
          stmts.push(stmt)
        }
      }
      current = ''
      i++
    } else {
      current += text[i]
      i++
    }
  }
  return stmts
}

const statements = splitStatements(content)
console.log(`Ejecutando ${statements.length} statements...`)

for (const stmt of statements) {
  try {
    await sql([stmt])
    const preview = stmt.replace(/\s+/g, ' ').slice(0, 70)
    console.log('✅', preview)
  } catch (e) {
    const preview = stmt.replace(/\s+/g, ' ').slice(0, 70)
    console.error('❌', preview)
    console.error('   ', e.message)
  }
}

console.log('Listo.')
