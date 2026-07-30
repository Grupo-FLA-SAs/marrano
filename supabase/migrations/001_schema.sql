-- ============================================================
-- MARRANO — Migración 001: Schema completo
-- ============================================================

-- Extensiones
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TOURNAMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS tournaments (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  TEXT NOT NULL,
  description           TEXT,
  start_date            DATE NOT NULL,
  status                TEXT NOT NULL DEFAULT 'configuracion'
                        CHECK (status IN ('configuracion','en_curso','finalizado')),
  max_entries_per_set   INT NOT NULL DEFAULT 30 CHECK (max_entries_per_set BETWEEN 1 AND 100),
  sets_to_win           INT NOT NULL DEFAULT 2 CHECK (sets_to_win BETWEEN 1 AND 5),
  has_third_place_match BOOLEAN NOT NULL DEFAULT false,
  public_link_enabled   BOOLEAN NOT NULL DEFAULT false,
  public_token          TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(8), 'hex'),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- PLAYERS
-- ============================================================
CREATE TABLE IF NOT EXISTS players (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  full_name     TEXT NOT NULL,
  short_name    TEXT,
  photo_url     TEXT,
  handicap      INT NOT NULL CHECK (handicap > 0),
  status        TEXT NOT NULL DEFAULT 'activo'
                CHECK (status IN ('activo','retirado')),
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_players_tournament ON players(tournament_id);

-- ============================================================
-- PHASES
-- ============================================================
CREATE TABLE IF NOT EXISTS phases (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id        UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  name                 TEXT NOT NULL,
  phase_number         INT NOT NULL,
  status               TEXT NOT NULL DEFAULT 'borrador'
                       CHECK (status IN ('borrador','activa','finalizada')),
  num_groups           INT NOT NULL CHECK (num_groups > 0),
  qualifiers_per_group INT NOT NULL CHECK (qualifiers_per_group > 0),
  allow_uneven_groups  BOOLEAN NOT NULL DEFAULT true,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tournament_id, phase_number)
);
CREATE INDEX idx_phases_tournament ON phases(tournament_id);

-- ============================================================
-- GROUPS
-- ============================================================
CREATE TABLE IF NOT EXISTS groups (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_id      UUID NOT NULL REFERENCES phases(id) ON DELETE CASCADE,
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  group_number  INT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (phase_id, group_number)
);
CREATE INDEX idx_groups_phase ON groups(phase_id);
CREATE INDEX idx_groups_tournament ON groups(tournament_id);

-- ============================================================
-- GROUP_MEMBERS
-- ============================================================
CREATE TABLE IF NOT EXISTS group_members (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id      UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  phase_id      UUID NOT NULL REFERENCES phases(id) ON DELETE CASCADE,
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  player_id     UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  seed_position INT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (phase_id, player_id)  -- un jugador por fase
);
CREATE INDEX idx_group_members_group ON group_members(group_id);
CREATE INDEX idx_group_members_player ON group_members(player_id);

-- ============================================================
-- MATCHES
-- ============================================================
CREATE TABLE IF NOT EXISTS matches (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id  UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  phase_id       UUID REFERENCES phases(id) ON DELETE CASCADE,
  group_id       UUID REFERENCES groups(id) ON DELETE CASCADE,
  knockout_round TEXT CHECK (knockout_round IN ('octavos','cuartos','semifinal','final','tercer_puesto')),
  player_a_id    UUID NOT NULL REFERENCES players(id),
  player_b_id    UUID NOT NULL REFERENCES players(id),
  scheduled_at   TIMESTAMPTZ,
  table_number   TEXT,
  status         TEXT NOT NULL DEFAULT 'pendiente'
                 CHECK (status IN ('pendiente','programado','en_juego','terminado','anulado')),
  winner_id      UUID REFERENCES players(id),
  score_a        INT NOT NULL DEFAULT 0,
  score_b        INT NOT NULL DEFAULT 0,
  notes          TEXT,
  registered_by  UUID,  -- auth.users.id
  registered_at  TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (player_a_id <> player_b_id),
  CHECK (
    (phase_id IS NOT NULL AND group_id IS NOT NULL AND knockout_round IS NULL) OR
    (phase_id IS NULL AND group_id IS NULL AND knockout_round IS NOT NULL)
  )
);
CREATE INDEX idx_matches_tournament ON matches(tournament_id);
CREATE INDEX idx_matches_group ON matches(group_id);
CREATE INDEX idx_matches_phase ON matches(phase_id);
CREATE INDEX idx_matches_knockout ON matches(knockout_round) WHERE knockout_round IS NOT NULL;
CREATE INDEX idx_matches_players ON matches(player_a_id, player_b_id);

-- ============================================================
-- MATCH_SETS
-- ============================================================
CREATE TABLE IF NOT EXISTS match_sets (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id              UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  tournament_id         UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  set_number            INT NOT NULL CHECK (set_number BETWEEN 1 AND 5),
  player_a_carambolas   INT NOT NULL DEFAULT 0 CHECK (player_a_carambolas >= 0),
  player_b_carambolas   INT NOT NULL DEFAULT 0 CHECK (player_b_carambolas >= 0),
  player_a_entries      INT NOT NULL CHECK (player_a_entries BETWEEN 1 AND 100),
  player_b_entries      INT NOT NULL CHECK (player_b_entries BETWEEN 1 AND 100),
  player_a_handicap     INT NOT NULL CHECK (player_a_handicap > 0),
  player_b_handicap     INT NOT NULL CHECK (player_b_handicap > 0),
  winner_id             UUID NOT NULL REFERENCES players(id),
  had_penalty           BOOLEAN NOT NULL DEFAULT false,
  penalty_winner_id     UUID REFERENCES players(id),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (match_id, set_number)
);
CREATE INDEX idx_match_sets_match ON match_sets(match_id);
CREATE INDEX idx_match_sets_tournament ON match_sets(tournament_id);

-- ============================================================
-- PHASE_QUALIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS phase_qualifications (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_id             UUID NOT NULL REFERENCES phases(id) ON DELETE CASCADE,
  tournament_id        UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  player_id            UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  group_id             UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  status               TEXT NOT NULL DEFAULT 'pendiente'
                       CHECK (status IN ('clasificado','eliminado','pendiente')),
  position_in_group    INT,
  is_marrano           BOOLEAN NOT NULL DEFAULT false,
  is_marrano_confirmed BOOLEAN NOT NULL DEFAULT false,
  resolved_by          UUID,  -- auth.users.id
  resolution_method    TEXT CHECK (resolution_method IN ('automatico','directo','mini_tabla','penaltis','manual')),
  resolution_notes     TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (phase_id, player_id)
);
CREATE INDEX idx_qualifications_phase ON phase_qualifications(phase_id);
CREATE INDEX idx_qualifications_player ON phase_qualifications(player_id);

-- ============================================================
-- KNOCKOUT_SEEDS
-- ============================================================
CREATE TABLE IF NOT EXISTS knockout_seeds (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id       UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  player_id           UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  seed_number         INT NOT NULL CHECK (seed_number BETWEEN 1 AND 16),
  historical_position INT NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tournament_id, seed_number),
  UNIQUE (tournament_id, player_id)
);
CREATE INDEX idx_seeds_tournament ON knockout_seeds(tournament_id);

-- ============================================================
-- HISTORICAL_STATS
-- ============================================================
CREATE TABLE IF NOT EXISTS historical_stats (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id          UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  player_id              UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  matches_played         INT NOT NULL DEFAULT 0,
  matches_won            INT NOT NULL DEFAULT 0,
  matches_lost           INT NOT NULL DEFAULT 0,
  sets_played            INT NOT NULL DEFAULT 0,
  sets_won               INT NOT NULL DEFAULT 0,
  sets_lost              INT NOT NULL DEFAULT 0,
  total_carambolas       INT NOT NULL DEFAULT 0,
  total_handicap_available INT NOT NULL DEFAULT 0,
  total_entries          INT NOT NULL DEFAULT 0,
  entries_in_won_sets    INT NOT NULL DEFAULT 0,
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tournament_id, player_id)
);
CREATE INDEX idx_historical_stats_tournament ON historical_stats(tournament_id);
CREATE INDEX idx_historical_stats_player ON historical_stats(player_id);

-- ============================================================
-- AUDIT_EVENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id   UUID REFERENCES tournaments(id) ON DELETE SET NULL,
  user_id         UUID,  -- auth.users.id
  action          TEXT NOT NULL,
  entity_type     TEXT NOT NULL,
  entity_id       UUID,
  reason          TEXT,
  previous_values JSONB,
  new_values      JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_tournament ON audit_events(tournament_id);
CREATE INDEX idx_audit_entity ON audit_events(entity_type, entity_id);
CREATE INDEX idx_audit_created ON audit_events(created_at DESC);

-- ============================================================
-- SHARE_CARDS
-- ============================================================
CREATE TABLE IF NOT EXISTS share_cards (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  card_type     TEXT NOT NULL,
  custom_title  TEXT,
  custom_text   TEXT,
  entity_id     UUID,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- Trigger para updated_at automático
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'tournaments','players','phases','matches','match_sets',
    'phase_qualifications','historical_stats'
  ]
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_%1$s_updated_at ON %1$s;
       CREATE TRIGGER trg_%1$s_updated_at
       BEFORE UPDATE ON %1$s
       FOR EACH ROW EXECUTE FUNCTION set_updated_at();',
      t
    );
  END LOOP;
END;
$$;
