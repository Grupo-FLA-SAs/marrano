// ============================================================
// MARRANO — Tipos de base de datos (generados a mano)
// Ejecuta `npx supabase gen types typescript` para regenerar
// ============================================================

export type TournamentStatus = 'configuracion' | 'en_curso' | 'finalizado'
export type PhaseStatus = 'borrador' | 'activa' | 'finalizada'
export type MatchStatus = 'pendiente' | 'programado' | 'en_juego' | 'terminado' | 'anulado'
export type PlayerStatus = 'activo' | 'retirado'
export type QualificationStatus = 'clasificado' | 'eliminado' | 'pendiente'
export type KnockoutRound = 'octavos' | 'cuartos' | 'semifinal' | 'final' | 'tercer_puesto'

export interface Tournament {
  id: string
  name: string
  description: string | null
  start_date: string
  status: TournamentStatus
  max_entries_per_set: number
  sets_to_win: number
  has_third_place_match: boolean
  public_link_enabled: boolean
  public_token: string
  created_at: string
  updated_at: string
}

export interface Player {
  id: string
  tournament_id: string
  full_name: string
  short_name: string | null
  photo_url: string | null
  handicap: number
  status: PlayerStatus
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Phase {
  id: string
  tournament_id: string
  name: string
  phase_number: number
  status: PhaseStatus
  num_groups: number
  qualifiers_per_group: number
  allow_uneven_groups: boolean
  created_at: string
  updated_at: string
}

export interface Group {
  id: string
  phase_id: string
  tournament_id: string
  name: string
  group_number: number
  created_at: string
}

export interface GroupMember {
  id: string
  group_id: string
  phase_id: string
  tournament_id: string
  player_id: string
  seed_position: number | null
  created_at: string
  player?: Player
}

export interface Match {
  id: string
  tournament_id: string
  phase_id: string | null
  group_id: string | null
  knockout_round: KnockoutRound | null
  player_a_id: string
  player_b_id: string
  scheduled_at: string | null
  table_number: string | null
  status: MatchStatus
  winner_id: string | null
  score_a: number      // sets ganados por A
  score_b: number      // sets ganados por B
  notes: string | null
  registered_by: string | null
  registered_at: string | null
  created_at: string
  updated_at: string
  player_a?: Player
  player_b?: Player
  sets?: MatchSet[]
}

export interface MatchSet {
  id: string
  match_id: string
  tournament_id: string
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
  created_at: string
  updated_at: string
}

export interface PhaseQualification {
  id: string
  phase_id: string
  tournament_id: string
  player_id: string
  group_id: string
  status: QualificationStatus
  position_in_group: number | null
  is_marrano: boolean        // último del grupo
  is_marrano_confirmed: boolean
  resolved_by: string | null
  resolution_method: 'automatico' | 'directo' | 'mini_tabla' | 'penaltis' | 'manual' | null
  resolution_notes: string | null
  created_at: string
  updated_at: string
  player?: Player
}

export interface KnockoutSeed {
  id: string
  tournament_id: string
  player_id: string
  seed_number: number         // 1-16
  historical_position: number // posición en Marranómetro general
  created_at: string
  player?: Player
}

export interface HistoricalStats {
  id: string
  tournament_id: string
  player_id: string
  matches_played: number
  matches_won: number
  matches_lost: number
  sets_played: number
  sets_won: number
  sets_lost: number
  total_carambolas: number
  total_handicap_available: number  // suma de hándicaps de sets jugados
  total_entries: number
  entries_in_won_sets: number
  updated_at: string
  player?: Player
}

export interface AuditEvent {
  id: string
  tournament_id: string | null
  user_id: string
  action: string
  entity_type: string
  entity_id: string | null
  reason: string | null
  previous_values: Record<string, unknown> | null
  new_values: Record<string, unknown> | null
  created_at: string
}

export interface ShareCard {
  id: string
  tournament_id: string
  card_type: string
  custom_title: string | null
  custom_text: string | null
  entity_id: string | null
  created_at: string
}

// ============================================================
// Tipos calculados (no almacenados en BD)
// ============================================================

export interface GroupStanding {
  player: Player
  played: number
  won: number
  lost: number
  points: number
  sets_won: number
  sets_lost: number
  set_diff: number
  carambolas: number
  total_handicap: number
  avg_completion: number  // carambolas/handicap promedio
  avg_entries: number
  qualification_status: QualificationStatus | null
  position: number
  tiebreak_reason: TiebreakReason
}

export type TiebreakReason =
  | 'puntos'
  | 'enfrentamiento_directo'
  | 'mini_tabla'
  | 'penaltis'
  | 'manual'
  | 'pendiente'

export interface HistoricalRanking {
  player: Player
  stats: HistoricalStats
  win_pct: number
  avg_sets_won_per_match: number
  avg_set_diff_per_match: number
  avg_handicap_completion: number
  avg_entries_won_sets: number
  position: number
  seed_position: number | null  // entre clasificados a octavos
  current_status: 'activo' | 'clasificado' | 'eliminado' | 'retirado'
}

export interface KnockoutBracket {
  round: KnockoutRound
  matches: Match[]
}
