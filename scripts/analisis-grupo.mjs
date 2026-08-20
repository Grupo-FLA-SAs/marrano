import { neon } from '@neondatabase/serverless'
import { readFileSync } from 'fs'

const url = readFileSync('.env.local', 'utf8').match(/DATABASE_URL=(.+)/)?.[1]?.trim()
const sql = neon(url)

const [tournament] = await sql`SELECT id, name, sets_to_win FROM tournaments WHERE status IN ('configuracion','en_curso') ORDER BY created_at DESC LIMIT 1`
const groups = await sql`SELECT g.* FROM groups g JOIN phases ph ON ph.id = g.phase_id WHERE ph.tournament_id = ${tournament.id} AND UPPER(g.name) LIKE '%A%' LIMIT 1`
const group = groups[0]
const qualify = (await sql`SELECT qualifiers_per_group FROM phases WHERE id = ${group.phase_id} LIMIT 1`)[0]?.qualifiers_per_group ?? 2
const setsToWin = tournament.sets_to_win ?? 2

const members = await sql`SELECT p.id, p.full_name, p.short_name, p.handicap FROM group_members gm JOIN players p ON p.id = gm.player_id WHERE gm.group_id = ${group.id}`
const allMatches = await sql`SELECT m.* FROM matches m WHERE m.group_id = ${group.id}`

console.log(`Torneo: ${tournament.name} | Grupo: ${group.name} | Clasifican top ${qualify}\n`)

// Construye standings a partir de una lista de partidos
function buildStandings(matches) {
  const s = {}
  for (const p of members) s[p.id] = { id: p.id, name: p.short_name ?? p.full_name, pts: 0, pg: 0, pp: 0, pj: 0, sg: 0, sp: 0 }
  for (const m of matches.filter(m => m.status === 'terminado' && m.winner_id)) {
    if (!s[m.player_a_id] || !s[m.player_b_id]) continue
    s[m.player_a_id].pj++; s[m.player_b_id].pj++
    s[m.player_a_id].sg += m.score_a; s[m.player_a_id].sp += m.score_b
    s[m.player_b_id].sg += m.score_b; s[m.player_b_id].sp += m.score_a
    if (m.winner_id === m.player_a_id) { s[m.player_a_id].pts++; s[m.player_a_id].pg++; s[m.player_b_id].pp++ }
    else { s[m.player_b_id].pts++; s[m.player_b_id].pg++; s[m.player_a_id].pp++ }
  }
  return Object.values(s)
}

// Desempate real: head-to-head para 2, mini-tabla para 3+
function applyTiebreakers(standings, matches) {
  const ranked = []
  const byPts = {}
  for (const s of standings) {
    byPts[s.pts] = byPts[s.pts] ?? []
    byPts[s.pts].push(s)
  }
  let pos = 1
  for (const pts of Object.keys(byPts).sort((a,b) => b-a)) {
    const group = byPts[pts]
    if (group.length === 1) {
      ranked.push({ ...group[0], pos, reason: 'puntos' }); pos++; continue
    }
    // Desempate
    const ids = group.map(s => s.id)
    const h2h = matches.filter(m => m.status === 'terminado' && m.winner_id && ids.includes(m.player_a_id) && ids.includes(m.player_b_id))

    if (group.length === 2) {
      const match = h2h[h2h.length - 1]
      if (match?.winner_id) {
        const winner = group.find(s => s.id === match.winner_id)
        const loser = group.find(s => s.id !== match.winner_id)
        ranked.push({ ...winner, pos, reason: 'enfrentamiento directo' })
        ranked.push({ ...loser, pos: pos+1, reason: 'enfrentamiento directo' })
      } else {
        group.forEach((s,i) => ranked.push({ ...s, pos: pos+i, reason: 'pendiente ⚠️' }))
      }
    } else {
      // Mini-tabla: 2pts por 2-0, 1pt por 2-1
      const miniPts = {}
      ids.forEach(id => miniPts[id] = 0)
      for (const m of h2h) {
        if (!m.winner_id) continue
        const ws = m.winner_id === m.player_a_id ? m.score_a : m.score_b
        const ls = m.winner_id === m.player_a_id ? m.score_b : m.score_a
        miniPts[m.winner_id] += (ws === setsToWin && ls === 0) ? 2 : 1
      }
      const sorted = [...group].sort((a,b) => miniPts[b.id] - miniPts[a.id])
      sorted.forEach((s,i) => {
        const tied = sorted.filter(x => miniPts[x.id] === miniPts[s.id])
        const reason = tied.length > 1 ? 'pendiente ⚠️' : 'mini-tabla'
        ranked.push({ ...s, pos: pos+i, reason, miniPts: miniPts[s.id] })
      })
    }
    pos += group.length
  }
  return ranked.sort((a,b) => a.pos - b.pos)
}

function printTable(ranked) {
  ranked.forEach(s => {
    const mini = s.miniPts !== undefined ? ` mini=${s.miniPts}` : ''
    console.log(`  ${s.pos}. ${s.name.padEnd(22)} Pts=${s.pts} PG=${s.pg} PP=${s.pp} SG=${s.sg} SP=${s.sp} [${s.reason}]${mini}`)
  })
}

// Estado actual
const currentStandings = buildStandings(allMatches)
const currentRanked = applyTiebreakers(currentStandings, allMatches)
console.log('=== TABLA ACTUAL ===')
printTable(currentRanked)

const pendientes = allMatches.filter(m => m.status !== 'terminado' && m.status !== 'anulado')
const nameMap = {}
for (const p of members) nameMap[p.id] = p.short_name ?? p.full_name
console.log(`\nPartidos pendientes:`)
pendientes.forEach(m => console.log(`  • ${nameMap[m.player_a_id]} vs ${nameMap[m.player_b_id]}`))

const jorge = members.find(p => p.full_name.toUpperCase().includes('JORGE') && p.full_name.toUpperCase().includes('POVEDA'))
const ricardo = members.find(p => p.full_name.toUpperCase().includes('RICARDO'))
if (!jorge || !ricardo) { console.log('\nNo encontré a Jorge o Ricardo en este grupo'); process.exit(0) }

function simulate(label, winnerId, scoreA, scoreB) {
  const simMatches = [...allMatches.filter(m => m.status === 'terminado' || m.status === 'anulado'), {
    id: 'sim', player_a_id: jorge.id, player_b_id: ricardo.id,
    status: 'terminado', winner_id: winnerId, score_a: scoreA, score_b: scoreB
  }]
  const st = buildStandings(simMatches)
  const ranked = applyTiebreakers(st, simMatches)
  const jorgePos = ranked.find(s => s.id === jorge.id)
  console.log(`\n--- ${label} ---`)
  printTable(ranked)
  console.log(`  → Jorge queda ${jorgePos?.pos}° → ${jorgePos?.pos <= qualify ? '✅ CLASIFICA' : '❌ ELIMINADO'}`)
}

console.log('\n=== SIMULACIONES ===')
simulate(`Jorge GANA 2-0`, jorge.id, setsToWin, 0)
simulate(`Jorge GANA 2-1`, jorge.id, setsToWin, setsToWin-1)
simulate(`Jorge PIERDE 1-2`, ricardo.id, setsToWin-1, setsToWin)
simulate(`Jorge PIERDE 0-2`, ricardo.id, 0, setsToWin)
