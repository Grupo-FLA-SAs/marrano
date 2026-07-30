-- ============================================================
-- MARRANO — Migración 003: Funciones de servidor
-- ============================================================

-- ============================================================
-- Función: actualizar estadísticas históricas después de un partido
-- Se llama desde el cliente al registrar/actualizar un resultado
-- ============================================================
CREATE OR REPLACE FUNCTION update_historical_stats(p_match_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_match matches%ROWTYPE;
  v_set   match_sets%ROWTYPE;
BEGIN
  -- Cargar partido
  SELECT * INTO v_match FROM matches WHERE id = p_match_id AND status = 'terminado';
  IF NOT FOUND THEN RETURN; END IF;

  -- Inicializar stats si no existen
  INSERT INTO historical_stats (tournament_id, player_id)
  VALUES
    (v_match.tournament_id, v_match.player_a_id),
    (v_match.tournament_id, v_match.player_b_id)
  ON CONFLICT (tournament_id, player_id) DO NOTHING;

  -- Actualizar match stats para A
  UPDATE historical_stats SET
    matches_played = matches_played + 1,
    matches_won    = matches_won + CASE WHEN v_match.winner_id = v_match.player_a_id THEN 1 ELSE 0 END,
    matches_lost   = matches_lost + CASE WHEN v_match.winner_id <> v_match.player_a_id THEN 1 ELSE 0 END,
    sets_won       = sets_won + v_match.score_a,
    sets_lost      = sets_lost + v_match.score_b
  WHERE tournament_id = v_match.tournament_id AND player_id = v_match.player_a_id;

  -- Actualizar match stats para B
  UPDATE historical_stats SET
    matches_played = matches_played + 1,
    matches_won    = matches_won + CASE WHEN v_match.winner_id = v_match.player_b_id THEN 1 ELSE 0 END,
    matches_lost   = matches_lost + CASE WHEN v_match.winner_id <> v_match.player_b_id THEN 1 ELSE 0 END,
    sets_won       = sets_won + v_match.score_b,
    sets_lost      = sets_lost + v_match.score_a
  WHERE tournament_id = v_match.tournament_id AND player_id = v_match.player_b_id;

  -- Acumular stats de sets
  FOR v_set IN SELECT * FROM match_sets WHERE match_id = p_match_id LOOP
    -- Jugador A
    UPDATE historical_stats SET
      sets_played            = sets_played + 1,
      total_carambolas       = total_carambolas + v_set.player_a_carambolas,
      total_handicap_available = total_handicap_available + v_set.player_a_handicap,
      total_entries          = total_entries + v_set.player_a_entries,
      entries_in_won_sets    = entries_in_won_sets +
        CASE WHEN v_set.winner_id = v_match.player_a_id THEN v_set.player_a_entries ELSE 0 END
    WHERE tournament_id = v_match.tournament_id AND player_id = v_match.player_a_id;

    -- Jugador B
    UPDATE historical_stats SET
      sets_played            = sets_played + 1,
      total_carambolas       = total_carambolas + v_set.player_b_carambolas,
      total_handicap_available = total_handicap_available + v_set.player_b_handicap,
      total_entries          = total_entries + v_set.player_b_entries,
      entries_in_won_sets    = entries_in_won_sets +
        CASE WHEN v_set.winner_id = v_match.player_b_id THEN v_set.player_b_entries ELSE 0 END
    WHERE tournament_id = v_match.tournament_id AND player_id = v_match.player_b_id;
  END LOOP;
END;
$$;

-- ============================================================
-- Función: revertir estadísticas históricas de un partido
-- Usada cuando se corrige un resultado ya registrado
-- ============================================================
CREATE OR REPLACE FUNCTION revert_historical_stats(p_match_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_match matches%ROWTYPE;
  v_set   match_sets%ROWTYPE;
BEGIN
  SELECT * INTO v_match FROM matches WHERE id = p_match_id;
  IF NOT FOUND THEN RETURN; END IF;

  -- Revertir match stats para A
  UPDATE historical_stats SET
    matches_played = GREATEST(0, matches_played - 1),
    matches_won    = GREATEST(0, matches_won - CASE WHEN v_match.winner_id = v_match.player_a_id THEN 1 ELSE 0 END),
    matches_lost   = GREATEST(0, matches_lost - CASE WHEN v_match.winner_id <> v_match.player_a_id THEN 1 ELSE 0 END),
    sets_won       = GREATEST(0, sets_won - v_match.score_a),
    sets_lost      = GREATEST(0, sets_lost - v_match.score_b)
  WHERE tournament_id = v_match.tournament_id AND player_id = v_match.player_a_id;

  -- Revertir match stats para B
  UPDATE historical_stats SET
    matches_played = GREATEST(0, matches_played - 1),
    matches_won    = GREATEST(0, matches_won - CASE WHEN v_match.winner_id = v_match.player_b_id THEN 1 ELSE 0 END),
    matches_lost   = GREATEST(0, matches_lost - CASE WHEN v_match.winner_id <> v_match.player_b_id THEN 1 ELSE 0 END),
    sets_won       = GREATEST(0, sets_won - v_match.score_b),
    sets_lost      = GREATEST(0, sets_lost - v_match.score_a)
  WHERE tournament_id = v_match.tournament_id AND player_id = v_match.player_b_id;

  -- Revertir stats de sets
  FOR v_set IN SELECT * FROM match_sets WHERE match_id = p_match_id LOOP
    UPDATE historical_stats SET
      sets_played              = GREATEST(0, sets_played - 1),
      total_carambolas         = GREATEST(0, total_carambolas - v_set.player_a_carambolas),
      total_handicap_available = GREATEST(0, total_handicap_available - v_set.player_a_handicap),
      total_entries            = GREATEST(0, total_entries - v_set.player_a_entries),
      entries_in_won_sets      = GREATEST(0, entries_in_won_sets -
        CASE WHEN v_set.winner_id = v_match.player_a_id THEN v_set.player_a_entries ELSE 0 END)
    WHERE tournament_id = v_match.tournament_id AND player_id = v_match.player_a_id;

    UPDATE historical_stats SET
      sets_played              = GREATEST(0, sets_played - 1),
      total_carambolas         = GREATEST(0, total_carambolas - v_set.player_b_carambolas),
      total_handicap_available = GREATEST(0, total_handicap_available - v_set.player_b_handicap),
      total_entries            = GREATEST(0, total_entries - v_set.player_b_entries),
      entries_in_won_sets      = GREATEST(0, entries_in_won_sets -
        CASE WHEN v_set.winner_id = v_match.player_b_id THEN v_set.player_b_entries ELSE 0 END)
    WHERE tournament_id = v_match.tournament_id AND player_id = v_match.player_b_id;
  END LOOP;
END;
$$;

-- ============================================================
-- Vista: ranking histórico calculado
-- ============================================================
CREATE OR REPLACE VIEW v_historical_ranking AS
SELECT
  h.*,
  p.full_name,
  p.short_name,
  p.handicap,
  p.status AS player_status,
  CASE WHEN h.matches_played > 0
       THEN ROUND((h.matches_won::NUMERIC / h.matches_played) * 100, 2)
       ELSE 0 END AS win_pct,
  CASE WHEN h.matches_played > 0
       THEN ROUND(h.sets_won::NUMERIC / h.matches_played, 3)
       ELSE 0 END AS avg_sets_won_per_match,
  CASE WHEN h.matches_played > 0
       THEN ROUND((h.sets_won - h.sets_lost)::NUMERIC / h.matches_played, 3)
       ELSE 0 END AS avg_set_diff_per_match,
  CASE WHEN h.total_handicap_available > 0
       THEN ROUND(h.total_carambolas::NUMERIC / h.total_handicap_available, 4)
       ELSE 0 END AS avg_handicap_completion,
  CASE WHEN h.sets_won > 0
       THEN ROUND(h.entries_in_won_sets::NUMERIC / h.sets_won, 3)
       ELSE 999 END AS avg_entries_won_sets
FROM historical_stats h
JOIN players p ON p.id = h.player_id
ORDER BY
  win_pct DESC,
  avg_sets_won_per_match DESC,
  avg_set_diff_per_match DESC,
  avg_handicap_completion DESC,
  avg_entries_won_sets ASC,
  p.id ASC;

-- ============================================================
-- Función: obtener el torneo activo
-- ============================================================
CREATE OR REPLACE FUNCTION get_active_tournament()
RETURNS tournaments
LANGUAGE sql
STABLE
AS $$
  SELECT * FROM tournaments
  WHERE status IN ('configuracion', 'en_curso')
  ORDER BY created_at DESC
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION get_active_tournament() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION update_historical_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION revert_historical_stats(UUID) TO authenticated;
GRANT SELECT ON v_historical_ranking TO anon, authenticated;
