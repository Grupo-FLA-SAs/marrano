import { neon } from '@neondatabase/serverless'
import { readFileSync } from 'fs'

const env = readFileSync('.env.local', 'utf8')
const url = env.match(/DATABASE_URL=(.+)/)?.[1]?.trim()
const sql = neon(url)

// Ver partidos de Omar Vargas y Gustavo Duran
const matches = await sql([`
  SELECT m.id, m.status, m.score_a, m.score_b, m.created_at,
    pa.full_name as player_a, pb.full_name as player_b,
    COUNT(ms.id) as set_count
  FROM matches m
  JOIN players pa ON pa.id = m.player_a_id
  JOIN players pb ON pb.id = m.player_b_id
  LEFT JOIN match_sets ms ON ms.match_id = m.id
  WHERE (LOWER(pa.full_name) LIKE '%omar%' OR LOWER(pa.full_name) LIKE '%gustavo%'
      OR LOWER(pb.full_name) LIKE '%omar%' OR LOWER(pb.full_name) LIKE '%gustavo%')
  GROUP BY m.id, pa.full_name, pb.full_name
  ORDER BY m.created_at
`])

console.log('\nPartidos encontrados:')
matches.forEach((m, i) => {
  console.log(`[${i}] id=${m.id} | ${m.player_a} vs ${m.player_b} | status=${m.status} | score=${m.score_a}-${m.score_b} | sets=${m.set_count} | creado=${m.created_at}`)
})

console.log('\nPara eliminar un partido duplicado, ejecutá:')
console.log('node scripts/fix-duplicates.mjs delete <id>')

const deleteId = process.argv[2] === 'delete' ? process.argv[3] : null
if (deleteId) {
  await sql([`DELETE FROM match_sets WHERE match_id = '${deleteId}'`])
  await sql([`UPDATE matches SET status='pendiente', winner_id=NULL, score_a=0, score_b=0 WHERE id='${deleteId}'`])
  console.log(`\n✅ Partido ${deleteId} reseteado a pendiente y sets borrados.`)
}
