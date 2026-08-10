# The Ant Adventures CRM

Next.js 14 CRM for The Ant Adventures. **Supabase (PostgreSQL v5)** is the production data store with auto-sync.

## Quick start

```bash
npm install
cp .env.example .env.local   # Windows: copy .env.example .env.local
npm run dev
```

Open [http://localhost:3006](http://localhost:3006) → redirects to `/dashboard`.

## Docker (production package)

Requires Docker + Compose. Uses Next.js `output: 'standalone'` ([`Dockerfile`](Dockerfile)). GitLab CI on `main` runs [`scripts/docker-with-env.sh`](scripts/docker-with-env.sh) (`print` → `build` → `deploy`) on runner tag `vm06-deploy-ant-admin`.

Env file (auto via `docker-with-env.sh`):
1. `ENV_FILE` if set
2. `$MNT_FDATA/sharing/.env.local` (or `env.local`) — CI sets `MNT_FDATA=/mnt/fdata/the_ant_adventures_crm`
3. `./.env.local` for local WSL/dev

```bash
npm run docker:up            # build + run on :3006
npm run docker:down
# override: ENV_FILE=/path/to/.env.local npm run docker:up
```

`NEXT_PUBLIC_*` are baked in at **image build** time. Server secrets come from the same env file at **runtime**. App data URL must be company self-host (`https://sb.mitelai.com:9001`) — never `127.0.0.1` on the VM.

### Checklist when Docker CI / deploy rights are ready

1. Confirm `$MNT_FDATA/sharing/.env.local` has company Supabase URL + keys (not localhost).
2. Push `main` → GitLab job `docker` builds and deploys; or run `npm run docker:up` on the VM.
3. Stop any leftover `npm run dev` on the host so it does not fight port **3006**.
4. Run `npm run docker:status` (or the CI `status` step) and open the demo URL / login.

## Environment variables

Edit **`.env.local`** (gitignored). Template: [`.env.example`](.env.example)

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | When using Supabase | Project URL (Settings → API) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | When using Supabase | Anon/public key |
| `NEXT_PUBLIC_USE_SUPABASE` | No | `true` = use Supabase (company self-host) |
| `NEXT_PUBLIC_SUPABASE_AUTO_SYNC` | No | `true` = auto-push edits to Supabase |
| `NEXT_PUBLIC_SUPABASE_READ_ONLY` | No | `true` = hydrate only (safe on shared DB) |
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
| `npm run db:migration:new -- name` | Create Supabase migration file |
| `npm run db:push` | Apply migrations (needs `SUPABASE_DB_URL` in `.env.local`) |
| `npm run db:bootstrap` | Mark baseline migrations on existing DB |

Supabase CLI setup: [`docs/SUPABASE-SETUP.md`](docs/SUPABASE-SETUP.md) §9.

Private notes, legacy HTML, and one-off migration tools live in **`Personal/`** (gitignored — local only).

## Logo

`public/Logo-3.svg`
