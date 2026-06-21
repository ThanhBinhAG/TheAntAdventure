# The Ant Adventures CRM

Next.js 14 CRM for The Ant Adventures. **Supabase (PostgreSQL v5)** is the production data store with auto-sync.

## Quick start

```bash
npm install
cp .env.example .env.local   # Windows: copy .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) → redirects to `/dashboard`.

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

```
app/                    # Next.js App Router
components/             # Page UI (26 routes)
lib/db/                 # Supabase adapter, mappers, auto-sync
lib/seeds/              # Local seed data
lib/store.ts            # Zustand store
supabase/               # PostgreSQL schema + data
docs/DATABASE.md        # ER diagram & table reference
docs/SUPABASE-SETUP.md  # Supabase install & connect
```

## Pages (26 routes)

`/dashboard` · `/planner` · `/customers` · `/agents` · `/sales` · `/tourdesign` · `/products` · `/gallery` · `/pricing` · `/bookings` · `/contracts` · `/suppliers` · `/guides` · `/weather` · `/attractions` · `/posttour` · `/finance` · `/tax` · `/salary` · `/about` · `/culture` · `/regulations` · `/hr` · `/ai` · `/devnotes` · `/teamchat`

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run extract` | Re-generate seeds/CSS from HTML source |

## Logo

`public/Logo-3.svg`
