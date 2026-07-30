-- ============================================================
-- MARRANO — Migración 002: Row Level Security
-- ============================================================

-- Habilitar RLS en todas las tablas operativas
ALTER TABLE tournaments          ENABLE ROW LEVEL SECURITY;
ALTER TABLE players              ENABLE ROW LEVEL SECURITY;
ALTER TABLE phases               ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups               ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members        ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches              ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_sets           ENABLE ROW LEVEL SECURITY;
ALTER TABLE phase_qualifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE knockout_seeds       ENABLE ROW LEVEL SECURITY;
ALTER TABLE historical_stats     ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events         ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_cards          ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- LECTURA PÚBLICA (SELECT sin autenticación)
-- Solo en tablas que la vista pública necesita
-- ============================================================

-- tournaments: lectura pública solo de torneos con enlace habilitado
CREATE POLICY "public_read_tournaments" ON tournaments
  FOR SELECT USING (public_link_enabled = true OR auth.role() = 'authenticated');

-- Los demás datos son visibles para autenticados y también públicamente
-- (el token de la URL pública actúa como control de acceso de facto)
CREATE POLICY "public_read_players" ON players
  FOR SELECT USING (true);

CREATE POLICY "public_read_phases" ON phases
  FOR SELECT USING (true);

CREATE POLICY "public_read_groups" ON groups
  FOR SELECT USING (true);

CREATE POLICY "public_read_group_members" ON group_members
  FOR SELECT USING (true);

CREATE POLICY "public_read_matches" ON matches
  FOR SELECT USING (true);

CREATE POLICY "public_read_match_sets" ON match_sets
  FOR SELECT USING (true);

CREATE POLICY "public_read_phase_qualifications" ON phase_qualifications
  FOR SELECT USING (true);

CREATE POLICY "public_read_knockout_seeds" ON knockout_seeds
  FOR SELECT USING (true);

CREATE POLICY "public_read_historical_stats" ON historical_stats
  FOR SELECT USING (true);

CREATE POLICY "public_read_share_cards" ON share_cards
  FOR SELECT USING (true);

-- audit_events: solo organizadores pueden leer
CREATE POLICY "auth_read_audit" ON audit_events
  FOR SELECT TO authenticated USING (true);

-- ============================================================
-- ESCRITURA: solo usuarios autenticados (organizadores)
-- ============================================================

CREATE POLICY "auth_insert_tournaments" ON tournaments
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "auth_update_tournaments" ON tournaments
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_insert_players" ON players
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "auth_update_players" ON players
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_delete_players" ON players
  FOR DELETE TO authenticated USING (true);

CREATE POLICY "auth_insert_phases" ON phases
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "auth_update_phases" ON phases
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_delete_phases" ON phases
  FOR DELETE TO authenticated USING (true);

CREATE POLICY "auth_insert_groups" ON groups
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "auth_update_groups" ON groups
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_delete_groups" ON groups
  FOR DELETE TO authenticated USING (true);

CREATE POLICY "auth_insert_group_members" ON group_members
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "auth_update_group_members" ON group_members
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_delete_group_members" ON group_members
  FOR DELETE TO authenticated USING (true);

CREATE POLICY "auth_insert_matches" ON matches
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "auth_update_matches" ON matches
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_delete_matches" ON matches
  FOR DELETE TO authenticated USING (true);

CREATE POLICY "auth_insert_match_sets" ON match_sets
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "auth_update_match_sets" ON match_sets
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_delete_match_sets" ON match_sets
  FOR DELETE TO authenticated USING (true);

CREATE POLICY "auth_insert_phase_qualifications" ON phase_qualifications
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "auth_update_phase_qualifications" ON phase_qualifications
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_insert_knockout_seeds" ON knockout_seeds
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "auth_update_knockout_seeds" ON knockout_seeds
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_delete_knockout_seeds" ON knockout_seeds
  FOR DELETE TO authenticated USING (true);

CREATE POLICY "auth_insert_historical_stats" ON historical_stats
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "auth_update_historical_stats" ON historical_stats
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_insert_audit" ON audit_events
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "auth_insert_share_cards" ON share_cards
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "auth_update_share_cards" ON share_cards
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_delete_share_cards" ON share_cards
  FOR DELETE TO authenticated USING (true);
