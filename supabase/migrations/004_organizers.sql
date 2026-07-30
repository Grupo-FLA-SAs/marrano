-- ============================================================
-- MARRANO — Tabla de organizadores (reemplaza Supabase Auth)
-- Ejecutar después de 001_schema.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS organizers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name        TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para búsqueda por email
CREATE INDEX IF NOT EXISTS idx_organizers_email ON organizers(email);
