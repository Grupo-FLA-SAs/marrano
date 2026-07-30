# 🐷 MARRANO — Torneo de Billar a Tres Bandas

> *"El torneo donde todos juegan y nadie quiere quedar de último."*

Aplicación web para administrar torneos de billar a tres bandas. Optimizada para celular, desplegable en Vercel + Supabase sin servicios pagos.

---

## Stack

- **Next.js 14** (App Router) + TypeScript
- **Tailwind CSS** (paleta temática de paño de billar)
- **Supabase** (PostgreSQL + Auth + RLS + Storage)
- **html2canvas** (tarjetas PNG para WhatsApp)
- **Jest + ts-jest** (20 pruebas unitarias)

---

## Instalación local

```bash
git clone <repo>
cd marrano
npm install
cp .env.example .env.local
# Edita .env.local con tus credenciales de Supabase
npm run dev
```

---

## Variables de entorno

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
NEXT_PUBLIC_APP_URL=https://tu-dominio.vercel.app
```

Obtén los valores en: **Supabase Dashboard → Settings → API**

---

## Migraciones de base de datos

En **Supabase Dashboard → SQL Editor**, ejecuta en orden:

1. `supabase/migrations/001_schema.sql` — Tablas, índices, triggers
2. `supabase/migrations/002_rls.sql` — Políticas de seguridad
3. `supabase/migrations/003_functions.sql` — Funciones y vistas

Con la CLI de Supabase:
```bash
npx supabase link --project-ref <ref>
npx supabase db push
```

---

## Seed de demostración

```sql
-- En el SQL Editor de Supabase (solo en desarrollo):
-- Ejecutar: supabase/seed.sql
-- Crea 1 torneo + 24 jugadores con hándicaps variados.
```

---

## Primer organizador

En **Supabase Dashboard → Authentication → Users → Add User**:
- Correo: `organizador@ejemplo.com`
- Contraseña: la que prefieras

Luego inicia sesión en `/login`.

---

## Despliegue en Vercel

1. Importa el repositorio en vercel.com
2. Configura las variables de entorno en Settings → Environment Variables
3. Deploy automático en cada push a `main`

---

## Pruebas unitarias

```bash
npm test
```

Cubre los 20 casos requeridos: generación de partidos, validación de sets, hándicap, distancias, penaltis, tablas, desempates, ranking histórico, siembra y cuadro eliminatorio.

---

## Pantallas

| Ruta | Descripción |
|------|-------------|
| `/login` | Inicio de sesión |
| `/` | El Corral (dashboard) |
| `/torneo` | Configuración del torneo |
| `/jugadores` | Lista de jugadores |
| `/jugadores/nuevo` | Crear jugador |
| `/jugadores/[id]` | Editar jugador / hándicap |
| `/jugadores/importar` | Importar desde CSV |
| `/fases` | La Marranera |
| `/fases/nueva` | Crear fase |
| `/fases/[id]` | Vista de grupos y posiciones |
| `/fases/[id]/sorteo` | Sorteo de grupos |
| `/fases/[id]/cierre` | Cierre de fase |
| `/partidos/[id]` | Registro de partido (móvil-first) |
| `/marranometro` | Ranking histórico |
| `/eliminatorias` | Cuadro eliminatorio |
| `/imagenes` | Tarjetas para WhatsApp |
| `/p/[token]` | Vista pública (solo lectura) |

---

## Reglas de negocio clave

**Sets:** Cada jugador tiene su contador de entradas independiente (máx. configurable). Gana quien alcance su hándicap. Si nadie lo alcanza, gana quien quede más cerca (menor `handicap - carambolas`). Distancias iguales = penaltis.

**Desempates:** 2 jugadores → enfrentamiento directo. 3+ → mini-tabla (2-0 vale 2 pts, 2-1 vale 1 pt). Si persiste empate → "pendiente" (penaltis externos, el organizador registra el resultado).

**Siembra:** Solo los 16 clasificados se ordenan entre sí por el Marranómetro. Un jugador en posición 18 histórica puede quedar sembrado 14 si clasificó. Cruces: 1v16, 2v15, ..., 8v9.

---

## Vocabulario

| App | Función real |
|-----|-------------|
| El Corral | Dashboard principal |
| La Marranera | Vista de grupos |
| Marranómetro | Ranking histórico |
| Marrano del grupo | Último de un grupo |
| Marranos de la ronda | Eliminados de una fase |
| Escapó del corral | Clasificó por poco |
| Maestro de las Tres Bandas | Campeón |
