# The Ant Adventures CRM

Next.js 16 CRM for The Ant Adventures (React 19, Node 22+). Supabase (PostgreSQL v5) is a server-only production data store.

## Quick start

**Requires Node 22+** ([`.nvmrc`](.nvmrc), `engines` in [`package.json`](package.json)).

```bash
nvm use          # Node 22 — install via nvm if needed
npm install
cp .env.example .env.local   # Windows: copy .env.example .env.local
npm run redis:up             # Redis on 127.0.0.1:6379 (cache only; do not docker:up while using npm run dev)
npm run dev
```

Open [http://localhost:3006](http://localhost:3006) → redirects to `/dashboard`.

### Redis (local dev)

Access Control staff-role lists, Product facets, and similar server reads cache in Redis when `REDIS_URL` is set ([`.env.example`](.env.example): `redis://127.0.0.1:6379`). Redis down does **not** fail those APIs; they fall back to Postgres.

```bash
npm run redis:up
docker compose -f docker-compose.local.yml exec redis redis-cli ping   # PONG
npm run dev                                # restart if Next was already running
```

Check [http://localhost:3006/api/health](http://localhost:3006/api/health) → `redis.configured: true`, `redis.ok: true`. Stop with `npm run redis:down` (does not start or stop the CRM container). Do not run `npm run docker:up` at the same time as `npm run dev` — both bind port **3006**.

## Docker (production package)

Requires Docker + Compose. Uses Next.js `output: 'standalone'` ([`Dockerfile`](Dockerfile)). GitLab CI on `main` runs [`scripts/docker-with-env.sh`](scripts/docker-with-env.sh) (`print` → `build` → `deploy`) on runner tag `vm06-deploy-ant-admin`.

Env file (auto via `docker-with-env.sh`):
1. `ENV_FILE` if set
2. `$MNT_FDATA/sharing/.env.local` (or `env.local`) — CI sets `MNT_FDATA=/mnt/fdata/the_ant_adventures_crm`
3. `./.env.local` for local WSL/dev

```bash
npm run docker:up            # deploy CRM on the existing APP_PORT upstream (default :3006)
npm run docker:down
# override: ENV_FILE=/path/to/.env.local npm run docker:up
```

Supabase configuration is injected only at **runtime**. Production CRM must use
`SUPABASE_URL=http://supabase-ant-crm-gateway:8000`. The CRM keeps its existing
`${APP_PORT:-3006}:3006` host-port upstream; reverse-proxy configuration is
operated separately and is not changed by this repository. See the
[deployment runbook](docs/runbooks/PRIVATE-NETWORK-CUTOVER.md).

For the reproducible final platform gate, run `npm run final:acceptance`. Set
`FINAL_ACCEPTANCE_E2E=1` only on the isolated Supabase E2E target.

### Checklist when Docker CI / deploy rights are ready

1. Confirm `$MNT_FDATA/sharing/.env.local` has company Supabase URL + keys (not localhost).
2. Confirm the existing ingress/proxy still targets the configured `APP_PORT` (default `3006`); no proxy configuration is changed by this deploy.
3. Push `main` → GitLab job `docker` builds, deploys, and verifies private dependencies.
4. Run `npm run docker:status` and open the normal CRM URL / login.

## Environment variables

Edit **`.env.local`** (gitignored). Template: [`.env.example`](.env.example)

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | When using Supabase | Server-only internal project URL |
| `SUPABASE_ANON_KEY` | When using Supabase | Server-only anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Optional | Server/scripts only — never expose in client |
| `REDIS_URL` | Optional | Server cache (`redis://127.0.0.1:6379` for `npm run dev`; `npm run redis:up`) |

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
