# The Ant Adventures CRM

Next.js 14 CRM for The Ant Adventures. **Supabase (PostgreSQL v5)** is the production data store with auto-sync.

## Quick start

```bash
npm install
cp .env.example .env.local   # Windows: copy .env.example .env.local
npm run dev
```

Open [http://localhost:3006](http://localhost:3006) → redirects to `/dashboard`.

## Environment variables

Edit **`.env.local`** (gitignored). Template: [`.env.example`](.env.example)

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | When using Supabase | Project URL (Settings → API) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | When using Supabase | Anon/public key |
| `NEXT_PUBLIC_USE_SUPABASE` | No | `false` = local only, `true` = Supabase |
| `NEXT_PUBLIC_SUPABASE_AUTO_SYNC` | No | `true` = auto-push edits to Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Optional | Server/scripts only — never expose in client |

After changing `.env.local`, restart: `npm run dev`.

## Database (PostgreSQL v5 on Supabase)

Full schema documentation: **[`docs/DATABASE.md`](docs/DATABASE.md)**

| File | Purpose |
|------|---------|
| [`supabase/schema.sql`](supabase/schema.sql) | **v5.0** — 35+ relational tables |
| [`supabase/import-v5-data.sql`](supabase/import-v5-data.sql) | Seed data (run after schema) |
| [`supabase/verify-counts-v5.sql`](supabase/verify-counts-v5.sql) | Verify row counts after import |
| [`supabase/reset-v5.sql`](supabase/reset-v5.sql) | Drop all CRM tables — clean reinstall |

**Supabase setup:** [`docs/SUPABASE-SETUP.md`](docs/SUPABASE-SETUP.md) — run `reset-v5.sql` (if needed) → `schema.sql` → `import-v5-data.sql` → `verify-counts-v5.sql` in SQL Editor.

## Backup / restore

- **⬇ Backup** (top bar) → JSON with full CRM state.
- **⬆ Restore** → replace local store from JSON.

## Architecture

Each meaningful folder has an [`AGENTS.md`](AGENTS.md) overview (Role / Contents / Boundaries). Read the nearest one when editing that subtree.

```
app/                         # Next.js App Router (CRM shell, login, API)
components/                  # UI — pages/, domain widgets, layout chrome
  tour-design/               # Tour Design wizard (URL slug still /tourdesign)
  gallery/                   # Photo library UI + StorageImage
hooks/                       # React hooks (store, language, pagination…)
tests/                       # Unit tests (tsx --test)

lib/
  store.ts · types.ts        # Zustand store + shared entity types
  constants.ts · env.ts      # NAV_SECTIONS, env helpers
  core/                      # Shared helpers (crm-utils, dates, money, print)
  customers/ · sales/        # Client onboarding, leads, bookings, agents
  tour-design/ · proposals/  # Tour builder, outline gate, proposal PDF/HTML
  pricing/ · products/       # Price lists, XLSX, catalogue, product codes
  gallery/ · attractions/    # Photos, tags, bulk upload, attraction helpers
  suppliers/ · contracts/    # Supplier filters/seeds, contract HTML
  outline/ · planner/        # Outline rich text/HTML, daily tasks
  dashboard/ · context/      # Dashboard metrics, Supabase React context
  db/ · supabase/ · auth/    # Sync, mappers, client, session
  weather/ · storage/        # Open-Meteo, photo upload paths
  system/ · i18n/ · seeds/   # Logging, diagnostics, i18n, seed data

supabase/                    # PostgreSQL schema + seed SQL
docs/DATABASE.md             # ER diagram & table reference
docs/SUPABASE-SETUP.md       # Supabase install & connect
```

Domain logic lives under `lib/<domain>/`. Import explicitly, e.g. `@/lib/sales/sales-lead-utils`, `@/lib/tour-design/tour-pricing`.

## Pages (28 routes)

`/dashboard` · `/planner` · `/customers` · `/agents` · `/sales` · `/tourdesign` · `/products` · `/gallery` · `/pricing` · `/pricing-essentials` · `/pricing-accommodation` · `/bookings` · `/contracts` · `/suppliers` · `/guides` · `/weather` · `/attractions` · `/posttour` · `/finance` · `/tax` · `/salary` · `/about` · `/culture` · `/regulations` · `/hr` · `/ai` · `/devnotes` · `/teamchat`

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Development server (port **3006**) |
| `npm run build` | Production build |
| `npm run typecheck` | TypeScript (`tsc --noEmit`) |
| `npm run test` | Unit tests (`tests/`) |

Private notes, legacy HTML, and one-off migration tools live in **`Personal/`** (gitignored — local only).

## Logo

`public/Logo-3.svg`
