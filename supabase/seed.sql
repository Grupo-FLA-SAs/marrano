-- ============================================================
-- MARRANO — Seed de demostración
-- Ejecutar SOLO en entorno de desarrollo.
-- NO ejecutar en producción automáticamente.
-- ============================================================

-- Crear torneo de demostración
INSERT INTO tournaments (id, name, description, start_date, status, max_entries_per_set, sets_to_win, has_third_place_match, public_link_enabled, public_token)
VALUES (
  'a1b2c3d4-0000-0000-0000-000000000001',
  'MARRANO 2025 — Torneo de Apertura',
  'El torneo donde todos juegan y nadie quiere quedar de último.',
  '2025-03-01',
  'en_curso',
  30,
  2,
  true,
  true,
  'demo2025marrano'
) ON CONFLICT (id) DO NOTHING;

-- 24 jugadores con hándicaps variados
WITH players_data(full_name, short_name, handicap) AS (
  VALUES
    ('Alejandro Rodríguez', 'El Maestro',  25),
    ('Carlos Mendoza',      'El Cañón',    20),
    ('Fernando García',     'El Zorro',    18),
    ('Guillermo Peña',      'El Gato',     15),
    ('Héctor Morales',      'El Toro',     22),
    ('Ignacio Vargas',      'Nacho',       12),
    ('Jorge Herrera',       'El Pollo',    17),
    ('Luis Castro',         'El Viejo',    10),
    ('Mario Suárez',        'El Niño',     14),
    ('Nelson Ríos',         'El Rayo',     19),
    ('Oscar Díaz',          'El Lento',     8),
    ('Pedro Jiménez',       'Pedrito',     16),
    ('Rafael Acosta',       'El Profe',    21),
    ('Sebastián Torres',    'El Seco',     13),
    ('Tomás Varela',        'El Grande',   24),
    ('Ulises Mora',         'El Zurdo',    11),
    ('Víctor Salinas',      'El Tigre',    20),
    ('Wilson Castaño',      'El Calvo',     9),
    ('Xavier Ponce',        'El Flaco',    16),
    ('Yamid Ortega',        'El Gordo',    23),
    ('Andrés Blanco',       'El Serio',    18),
    ('Bernardo Cruz',       'El Loco',     14),
    ('Camilo Duarte',       'El Nuevo',     7),
    ('Daniel Ruiz',         'El Beto',     15)
)
INSERT INTO players (tournament_id, full_name, short_name, handicap)
SELECT 'a1b2c3d4-0000-0000-0000-000000000001', full_name, short_name, handicap
FROM players_data
ON CONFLICT DO NOTHING;

-- Fase 1: 6 grupos de 4 jugadores
INSERT INTO phases (id, tournament_id, name, phase_number, status, num_groups, qualifiers_per_group, allow_uneven_groups)
VALUES (
  'b1b2c3d4-0000-0000-0000-000000000001',
  'a1b2c3d4-0000-0000-0000-000000000001',
  'Fase 1 — Grupos de apertura',
  1,
  'activa',
  6,
  3,
  true
) ON CONFLICT (id) DO NOTHING;

-- Nota: La generación de grupos, partidos y resultados se hace desde la interfaz.
-- Este seed solo provee el torneo y los jugadores para demostrar la aplicación.

-- Para un seed más completo con partidos jugados, ejecutar el archivo seed_full.sql
-- incluido en la documentación del proyecto.

SELECT 'Seed de demostración cargado correctamente.' AS resultado;
SELECT COUNT(*) || ' jugadores creados.' AS jugadores
FROM players
WHERE tournament_id = 'a1b2c3d4-0000-0000-0000-000000000001';
