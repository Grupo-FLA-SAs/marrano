/**
 * Todas las queries SQL del proyecto.
 * Usado por server components y API routes.
 */
import { sql, getSql } from '@/lib/db'

// ─── TORNEOS ────────────────────────────────────────────────────────────────

export async function getActiveTournament() {
  const rows = await sql`
    SELECT * FROM tournaments
    WHERE status IN ('configuracion', 'en_curso')
    ORDER BY created_at DESC LIMIT 1
  `
  return rows[0] ?? null
}

export async function getTournamentByToken(token: string) {
  const rows = await sql`
    SELECT * FROM tournaments
    WHERE public_token = ${token} AND public_link_enabled = true
    LIMIT 1
  `
  return rows[0] ?? null
}

export async function upsertTournament(data: Record<string, any>) {
  const t = await getActiveTournament()
  if (t) {
    const rows = await sql`
      UPDATE tournaments SET
        name = ${data.name},
        description = ${data.description ?? null},
        start_date = ${data.start_date ?? null},
        max_entries_per_set = ${data.max_entries_per_set ?? 30},
        sets_to_win = ${data.sets_to_win ?? 2},
        has_third_place_match = ${data.has_third_place_match ?? true},
        public_link_enabled = ${data.public_link_enabled ?? false},
        status = ${data.status ?? t.status},
        updated_at = NOW()
      WHERE id = ${t.id}
      RETURNING *
    `
    return rows[0]
  } else {
    const token = Math.random().toString(36).substring(2, 12)
    const rows = await sql`
      INSERT INTO tournaments (name, description, start_date, max_entries_per_set,
        sets_to_win, has_third_place_match, public_link_enabled, public_token, status)
      VALUES (${data.name}, ${data.description ?? null}, ${data.start_date ?? null},
        ${data.max_entries_per_set ?? 30}, ${data.sets_to_win ?? 2},
        ${data.has_third_place_match ?? true}, ${data.public_link_enabled ?? false},
        ${token}, 'configuracion')
      RETURNING *
    `
    return rows[0]
  }
}

// ─── JUGADORES ───────────────────────────────────────────────────────────────

export async function getPlayers(tournamentId: string) {
  return sql`
    SELECT * FROM players
    WHERE tournament_id = ${tournamentId}
    ORDER BY full_name
  `
}

export async function getPlayerById(id: string) {
  const rows = await sql`SELECT * FROM players WHERE id = ${id} LIMIT 1`
  return rows[0] ?? null
}

export async function createPlayer(data: Record<string, any>) {
  const rows = await sql`
    INSERT INTO players (tournament_id, full_name, short_name, handicap, notes)
    VALUES (${data.tournament_id}, ${data.full_name}, ${data.short_name ?? null},
            ${data.handicap}, ${data.notes ?? null})
    RETURNING *
  `
  return rows[0]
}

export async function updatePlayer(id: string, data: Record<string, any>) {
  const rows = await sql`
    UPDATE players SET
      full_name = ${data.full_name},
      short_name = ${data.short_name ?? null},
      handicap = ${data.handicap},
      notes = ${data.notes ?? null},
      updated_at = NOW()
    WHERE id = ${id}
    RETURNING *
  `
  return rows[0]
}

export async function countPlayerMatches(playerId: string): Promise<number> {
  const rows = await sql`
    SELECT COUNT(*) as cnt FROM matches
    WHERE (player_a_id = ${playerId} OR player_b_id = ${playerId})
      AND status = 'terminado'
  `
  return Number(rows[0]?.cnt ?? 0)
}

// ─── FASES ───────────────────────────────────────────────────────────────────

export async function getPhases(tournamentId: string) {
  return sql`
    SELECT * FROM phases
    WHERE tournament_id = ${tournamentId}
    ORDER BY phase_number
  `
}

export async function getPhaseById(id: string) {
  const rows = await sql`SELECT * FROM phases WHERE id = ${id} LIMIT 1`
  return rows[0] ?? null
}

export async function createPhase(data: Record<string, any>) {
  const rows = await sql`
    INSERT INTO phases (tournament_id, name, phase_number, status,
      num_groups, qualifiers_per_group, allow_uneven_groups)
    VALUES (${data.tournament_id}, ${data.name}, ${data.phase_number},
            'borrador', ${data.num_groups}, ${data.qualifiers_per_group},
            ${data.allow_uneven_groups ?? false})
    RETURNING *
  `
  return rows[0]
}

export async function updatePhaseStatus(id: string, status: string) {
  await sql`UPDATE phases SET status = ${status}, updated_at = NOW() WHERE id = ${id}`
}

// ─── GRUPOS ──────────────────────────────────────────────────────────────────

export async function getGroupsByPhase(phaseId: string) {
  return sql`SELECT * FROM groups WHERE phase_id = ${phaseId} ORDER BY group_number`
}

export async function getGroupWithMembers(groupId: string) {
  const members = await sql`
    SELECT gm.*, p.id as player_id, p.full_name, p.short_name, p.handicap
    FROM group_members gm
    JOIN players p ON p.id = gm.player_id
    WHERE gm.group_id = ${groupId}
  `
  return members
}

export async function getGroupsByPhaseWithMembers(phaseId: string) {
  return sql`
    SELECT gm.group_id, gm.player_id,
      p.id, p.full_name, p.short_name, p.handicap
    FROM group_members gm
    JOIN players p ON p.id = gm.player_id
    JOIN groups g ON g.id = gm.group_id
    WHERE g.phase_id = ${phaseId}
  `
}

// ─── PARTIDOS ────────────────────────────────────────────────────────────────

export async function getMatchById(id: string) {
  const rows = await sql`
    SELECT m.*,
      pa.id as pa_id, pa.full_name as pa_name, pa.short_name as pa_short, pa.handicap as pa_handicap,
      pb.id as pb_id, pb.full_name as pb_name, pb.short_name as pb_short, pb.handicap as pb_handicap
    FROM matches m
    JOIN players pa ON pa.id = m.player_a_id
    JOIN players pb ON pb.id = m.player_b_id
    WHERE m.id = ${id}
    LIMIT 1
  `
  if (!rows[0]) return null
  const m = rows[0]
  return {
    ...m,
    player_a: { id: m.pa_id, full_name: m.pa_name, short_name: m.pa_short, handicap: m.pa_handicap },
    player_b: { id: m.pb_id, full_name: m.pb_name, short_name: m.pb_short, handicap: m.pb_handicap },
  }
}

export async function getMatchSets(matchId: string) {
  return sql`SELECT * FROM match_sets WHERE match_id = ${matchId} ORDER BY set_number`
}

export async function getMatchesByGroup(groupId: string) {
  const rows = await sql`
    SELECT m.*, json_agg(ms.* ORDER BY ms.set_number) FILTER (WHERE ms.id IS NOT NULL) as sets
    FROM matches m
    LEFT JOIN match_sets ms ON ms.match_id = m.id
    WHERE m.group_id = ${groupId}
    GROUP BY m.id
  `
  return rows.map(r => ({ ...r, sets: r.sets ?? [] }))
}

export async function getMatchesByPhase(phaseId: string) {
  const rows = await sql`
    SELECT m.*, json_agg(ms.* ORDER BY ms.set_number) FILTER (WHERE ms.id IS NOT NULL) as sets
    FROM matches m
    JOIN groups g ON g.id = m.group_id
    LEFT JOIN match_sets ms ON ms.match_id = m.id
    WHERE g.phase_id = ${phaseId}
    GROUP BY m.id
  `
  return rows.map(r => ({ ...r, sets: r.sets ?? [] }))
}

export async function getKnockoutMatches(tournamentId: string) {
  const rows = await sql`
    SELECT m.*,
      pa.id as pa_id, pa.full_name as pa_name, pa.short_name as pa_short,
      pb.id as pb_id, pb.full_name as pb_name, pb.short_name as pb_short
    FROM matches m
    JOIN players pa ON pa.id = m.player_a_id
    JOIN players pb ON pb.id = m.player_b_id
    WHERE m.tournament_id = ${tournamentId}
      AND m.knockout_round IS NOT NULL
    ORDER BY m.created_at
  `
  return rows.map(m => ({
    ...m,
    player_a: { id: m.pa_id, full_name: m.pa_name, short_name: m.pa_short },
    player_b: { id: m.pb_id, full_name: m.pb_name, short_name: m.pb_short },
  }))
}

export async function getPendingMatches(tournamentId: string, limit = 5) {
  const rows = await sql`
    SELECT m.*,
      pa.full_name as pa_name, pa.short_name as pa_short,
      pb.full_name as pb_name, pb.short_name as pb_short,
      g.name as group_name
    FROM matches m
    JOIN players pa ON pa.id = m.player_a_id
    JOIN players pb ON pb.id = m.player_b_id
    LEFT JOIN groups g ON g.id = m.group_id
    WHERE m.tournament_id = ${tournamentId} AND m.status = 'pendiente'
    ORDER BY m.created_at
    LIMIT ${limit}
  `
  return rows
}

export async function updateMatch(id: string, data: Record<string, any>) {
  await sql`
    UPDATE matches SET
      status = ${data.status},
      winner_id = ${data.winner_id ?? null},
      score_a = ${data.score_a ?? 0},
      score_b = ${data.score_b ?? 0},
      updated_at = NOW()
    WHERE id = ${id}
  `
}

export async function deleteMatchSets(matchId: string) {
  await sql`DELETE FROM match_sets WHERE match_id = ${matchId}`
}

export async function insertMatchSet(data: Record<string, any>) {
  const rows = await sql`
    INSERT INTO match_sets (
      match_id, tournament_id, set_number,
      player_a_carambolas, player_b_carambolas,
      player_a_entries, player_b_entries,
      player_a_handicap, player_b_handicap,
      winner_id, had_penalty, penalty_winner_id
    ) VALUES (
      ${data.match_id}, ${data.tournament_id},
      ${data.set_number},
      ${data.player_a_carambolas ?? 0}, ${data.player_b_carambolas ?? 0},
      ${data.player_a_entries ?? 1}, ${data.player_b_entries ?? 1},
      ${data.player_a_handicap}, ${data.player_b_handicap},
      ${data.winner_id}, ${data.had_penalty ?? false},
      ${data.penalty_winner_id ?? null}
    )
    RETURNING *
  `
  return rows[0]
}

export interface MatchSetInput {
  set_number: number
  player_a_carambolas: number
  player_b_carambolas: number
  player_a_entries: number
  player_b_entries: number
  player_a_handicap: number
  player_b_handicap: number
  winner_id: string
  had_penalty: boolean
  penalty_winner_id: string | null
}

/**
 * Guarda sets + resultado del partido en UNA transacción Neon.
 * Si algo falla, no queda el partido a medias.
 */
export async function saveMatchResult(
  matchId: string,
  tournamentId: string,
  sets: MatchSetInput[],
  matchUpdate: { status: string; winner_id: string | null; score_a: number; score_b: number }
) {
  const client = getSql()

  for (const set of sets) {
    if (!set.winner_id) throw new Error(`Set ${set.set_number}: falta winner_id`)
    if (!(set.player_a_handicap > 0) || !(set.player_b_handicap > 0)) {
      throw new Error(`Set ${set.set_number}: hándicap inválido`)
    }
    if (set.player_a_entries < 1 || set.player_b_entries < 1) {
      throw new Error(`Set ${set.set_number}: entradas inválidas`)
    }
  }

  await client.transaction([
    client`DELETE FROM match_sets WHERE match_id = ${matchId}`,
    ...sets.map(set => client`
      INSERT INTO match_sets (
        match_id, tournament_id, set_number,
        player_a_carambolas, player_b_carambolas,
        player_a_entries, player_b_entries,
        player_a_handicap, player_b_handicap,
        winner_id, had_penalty, penalty_winner_id
      ) VALUES (
        ${matchId}, ${tournamentId},
        ${set.set_number},
        ${set.player_a_carambolas ?? 0}, ${set.player_b_carambolas ?? 0},
        ${set.player_a_entries ?? 1}, ${set.player_b_entries ?? 1},
        ${set.player_a_handicap}, ${set.player_b_handicap},
        ${set.winner_id}, ${set.had_penalty ?? false},
        ${set.penalty_winner_id ?? null}
      )
    `),
    client`
      UPDATE matches SET
        status = ${matchUpdate.status},
        winner_id = ${matchUpdate.winner_id ?? null},
        score_a = ${matchUpdate.score_a ?? 0},
        score_b = ${matchUpdate.score_b ?? 0},
        updated_at = NOW()
      WHERE id = ${matchId}
    `,
  ])
}

// ─── ESTADÍSTICAS HISTÓRICAS ─────────────────────────────────────────────────

export async function getHistoricalStats(tournamentId: string) {
  return sql`
    SELECT * FROM historical_stats WHERE tournament_id = ${tournamentId}
  `
}

async function ensureHistoricalRows(tournamentId: string, playerAId: string, playerBId: string) {
  await sql`
    INSERT INTO historical_stats (tournament_id, player_id)
    VALUES
      (${tournamentId}, ${playerAId}),
      (${tournamentId}, ${playerBId})
    ON CONFLICT (tournament_id, player_id) DO NOTHING
  `
}

/**
 * Actualiza historical_stats en TypeScript (no depende de la función PL/pgSQL
 * que a menudo no existe en Neon si solo se corrió el schema base).
 */
export async function updateHistoricalStats(matchId: string) {
  const rows = await sql`
    SELECT * FROM matches WHERE id = ${matchId} AND status = 'terminado' LIMIT 1
  `
  const match = rows[0]
  if (!match) return

  const sets = await sql`
    SELECT * FROM match_sets WHERE match_id = ${matchId} ORDER BY set_number
  `

  await ensureHistoricalRows(match.tournament_id, match.player_a_id, match.player_b_id)

  const aWon = match.winner_id === match.player_a_id ? 1 : 0
  const bWon = match.winner_id === match.player_b_id ? 1 : 0

  await sql`
    UPDATE historical_stats SET
      matches_played = matches_played + 1,
      matches_won    = matches_won + ${aWon},
      matches_lost   = matches_lost + ${1 - aWon},
      sets_won       = sets_won + ${match.score_a},
      sets_lost      = sets_lost + ${match.score_b}
    WHERE tournament_id = ${match.tournament_id} AND player_id = ${match.player_a_id}
  `
  await sql`
    UPDATE historical_stats SET
      matches_played = matches_played + 1,
      matches_won    = matches_won + ${bWon},
      matches_lost   = matches_lost + ${1 - bWon},
      sets_won       = sets_won + ${match.score_b},
      sets_lost      = sets_lost + ${match.score_a}
    WHERE tournament_id = ${match.tournament_id} AND player_id = ${match.player_b_id}
  `

  for (const set of sets) {
    const aSetWon = set.winner_id === match.player_a_id ? set.player_a_entries : 0
    const bSetWon = set.winner_id === match.player_b_id ? set.player_b_entries : 0
    await sql`
      UPDATE historical_stats SET
        sets_played = sets_played + 1,
        total_carambolas = total_carambolas + ${set.player_a_carambolas},
        total_handicap_available = total_handicap_available + ${set.player_a_handicap},
        total_entries = total_entries + ${set.player_a_entries},
        entries_in_won_sets = entries_in_won_sets + ${aSetWon}
      WHERE tournament_id = ${match.tournament_id} AND player_id = ${match.player_a_id}
    `
    await sql`
      UPDATE historical_stats SET
        sets_played = sets_played + 1,
        total_carambolas = total_carambolas + ${set.player_b_carambolas},
        total_handicap_available = total_handicap_available + ${set.player_b_handicap},
        total_entries = total_entries + ${set.player_b_entries},
        entries_in_won_sets = entries_in_won_sets + ${bSetWon}
      WHERE tournament_id = ${match.tournament_id} AND player_id = ${match.player_b_id}
    `
  }
}

export async function revertHistoricalStats(matchId: string) {
  const rows = await sql`SELECT * FROM matches WHERE id = ${matchId} LIMIT 1`
  const match = rows[0]
  if (!match) return

  const sets = await sql`
    SELECT * FROM match_sets WHERE match_id = ${matchId} ORDER BY set_number
  `

  const existingA = await sql`
    SELECT id FROM historical_stats
    WHERE tournament_id = ${match.tournament_id} AND player_id = ${match.player_a_id}
    LIMIT 1
  `
  if (existingA.length === 0) return

  const aWon = match.winner_id === match.player_a_id ? 1 : 0
  const bWon = match.winner_id === match.player_b_id ? 1 : 0

  await sql`
    UPDATE historical_stats SET
      matches_played = GREATEST(0, matches_played - 1),
      matches_won    = GREATEST(0, matches_won - ${aWon}),
      matches_lost   = GREATEST(0, matches_lost - ${1 - aWon}),
      sets_won       = GREATEST(0, sets_won - ${match.score_a}),
      sets_lost      = GREATEST(0, sets_lost - ${match.score_b})
    WHERE tournament_id = ${match.tournament_id} AND player_id = ${match.player_a_id}
  `
  await sql`
    UPDATE historical_stats SET
      matches_played = GREATEST(0, matches_played - 1),
      matches_won    = GREATEST(0, matches_won - ${bWon}),
      matches_lost   = GREATEST(0, matches_lost - ${1 - bWon}),
      sets_won       = GREATEST(0, sets_won - ${match.score_b}),
      sets_lost      = GREATEST(0, sets_lost - ${match.score_a})
    WHERE tournament_id = ${match.tournament_id} AND player_id = ${match.player_b_id}
  `

  for (const set of sets) {
    const aSetWon = set.winner_id === match.player_a_id ? set.player_a_entries : 0
    const bSetWon = set.winner_id === match.player_b_id ? set.player_b_entries : 0
    await sql`
      UPDATE historical_stats SET
        sets_played = GREATEST(0, sets_played - 1),
        total_carambolas = GREATEST(0, total_carambolas - ${set.player_a_carambolas}),
        total_handicap_available = GREATEST(0, total_handicap_available - ${set.player_a_handicap}),
        total_entries = GREATEST(0, total_entries - ${set.player_a_entries}),
        entries_in_won_sets = GREATEST(0, entries_in_won_sets - ${aSetWon})
      WHERE tournament_id = ${match.tournament_id} AND player_id = ${match.player_a_id}
    `
    await sql`
      UPDATE historical_stats SET
        sets_played = GREATEST(0, sets_played - 1),
        total_carambolas = GREATEST(0, total_carambolas - ${set.player_b_carambolas}),
        total_handicap_available = GREATEST(0, total_handicap_available - ${set.player_b_handicap}),
        total_entries = GREATEST(0, total_entries - ${set.player_b_entries}),
        entries_in_won_sets = GREATEST(0, entries_in_won_sets - ${bSetWon})
      WHERE tournament_id = ${match.tournament_id} AND player_id = ${match.player_b_id}
    `
  }
}

// ─── CLASIFICACIONES ─────────────────────────────────────────────────────────

export async function getQualifiedPlayers(tournamentId: string) {
  return sql`
    SELECT player_id, status FROM phase_qualifications
    WHERE tournament_id = ${tournamentId} AND status = 'clasificado'
  `
}

/** Solo los clasificados de la última fase finalizada (para siembra de eliminatorias) */
export async function getLastPhaseQualifiedPlayers(tournamentId: string) {
  return sql`
    SELECT pq.player_id
    FROM phase_qualifications pq
    JOIN phases ph ON ph.id = pq.phase_id
    WHERE pq.tournament_id = ${tournamentId}
      AND pq.status = 'clasificado'
      AND ph.status = 'finalizada'
      AND ph.phase_number = (
        SELECT MAX(phase_number) FROM phases
        WHERE tournament_id = ${tournamentId} AND status = 'finalizada'
      )
  `
}

export async function getEliminatedPlayers(tournamentId: string) {
  return sql`
    SELECT DISTINCT player_id FROM phase_qualifications
    WHERE tournament_id = ${tournamentId} AND status = 'eliminado'
  `
}

export async function getPhaseQualifications(phaseId: string) {
  return sql`
    SELECT pq.*, p.full_name, p.short_name
    FROM phase_qualifications pq
    JOIN players p ON p.id = pq.player_id
    WHERE pq.phase_id = ${phaseId}
  `
}

export async function upsertQualification(data: Record<string, any>) {
  await sql`
    INSERT INTO phase_qualifications
      (tournament_id, phase_id, player_id, group_id, status, position_in_group, is_marrano)
    VALUES
      (${data.tournament_id}, ${data.phase_id}, ${data.player_id}, ${data.group_id},
       ${data.status}, ${data.group_position ?? null}, ${data.is_marrano ?? false})
    ON CONFLICT (phase_id, player_id)
    DO UPDATE SET
      status = EXCLUDED.status,
      group_id = EXCLUDED.group_id,
      position_in_group = EXCLUDED.position_in_group,
      is_marrano = EXCLUDED.is_marrano,
      updated_at = NOW()
  `
}

// ─── SIEMBRA ─────────────────────────────────────────────────────────────────

export async function getKnockoutSeeds(tournamentId: string) {
  const rows = await sql`
    SELECT ks.*, p.id as player_id, p.full_name, p.short_name, p.handicap
    FROM knockout_seeds ks
    JOIN players p ON p.id = ks.player_id
    WHERE ks.tournament_id = ${tournamentId}
    ORDER BY ks.seed_number
  `
  return rows.map(s => ({
    ...s,
    player: { id: s.player_id, full_name: s.full_name, short_name: s.short_name, handicap: s.handicap }
  }))
}

export async function deleteKnockoutSeeds(tournamentId: string) {
  await sql`DELETE FROM knockout_seeds WHERE tournament_id = ${tournamentId}`
}

export async function insertKnockoutSeed(data: Record<string, any>) {
  await sql`
    INSERT INTO knockout_seeds (tournament_id, player_id, seed_number, historical_position)
    VALUES (${data.tournament_id}, ${data.player_id}, ${data.seed_number}, ${data.historical_position ?? null})
  `
}

export async function deleteKnockoutMatches(tournamentId: string, round: string) {
  await sql`
    DELETE FROM matches
    WHERE tournament_id = ${tournamentId} AND knockout_round = ${round}
  `
}

export async function insertKnockoutMatch(data: Record<string, any>) {
  const rows = await sql`
    INSERT INTO matches (tournament_id, player_a_id, player_b_id, knockout_round, status, score_a, score_b)
    VALUES (${data.tournament_id}, ${data.player_a_id}, ${data.player_b_id},
            ${data.knockout_round}, 'pendiente', 0, 0)
    RETURNING *
  `
  return rows[0]
}

// ─── DASHBOARD ───────────────────────────────────────────────────────────────

export async function getDashboardStats(tournamentId: string) {
  const [players, matches, phases] = await Promise.all([
    sql`SELECT COUNT(*) as cnt FROM players WHERE tournament_id = ${tournamentId}`,
    sql`SELECT COUNT(*) as cnt FROM matches WHERE tournament_id = ${tournamentId} AND status IN ('terminado', 'anulado')`,
    sql`SELECT * FROM phases WHERE tournament_id = ${tournamentId} AND status = 'activa' LIMIT 1`,
  ])
  return {
    playerCount: Number(players[0]?.cnt ?? 0),
    matchCount: Number(matches[0]?.cnt ?? 0),
    activePhase: phases[0] ?? null,
  }
}

// ─── ORGANIZADORES (auth) ────────────────────────────────────────────────────

export async function getOrganizerByEmail(email: string) {
  const rows = await sql`SELECT * FROM organizers WHERE email = ${email} LIMIT 1`
  return rows[0] ?? null
}

export async function createOrganizer(email: string, passwordHash: string, name?: string) {
  const rows = await sql`
    INSERT INTO organizers (email, password_hash, name)
    VALUES (${email}, ${passwordHash}, ${name ?? email})
    RETURNING *
  `
  return rows[0]
}
