# The Ant Adventures CRM v4.3

Next.js 14 port of the all-in-one HTML CRM (`index.html`). UI matches the original CSS; data runs on **Zustand + localStorage** by default, with optional **Supabase** sync for all CRM entities.

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
| `NEXT_PUBLIC_USE_SUPABASE` | No | `false` = local only (default), `true` = connect to Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Optional | Server/scripts only — never expose in client code |

After changing `.env.local`, restart: `npm run dev`.

---

## Migrate local data → Supabase (full guide)

All CRM tables sync to Supabase: customers, comms, leads, bookings, agents, guides, products, finance, contracts, tasks, team chat, suppliers, etc. (22 array tables + chat channels).

### Step 1 — Create Supabase tables

In [Supabase SQL Editor](https://supabase.com/dashboard), run the full script:

[`supabase/schema.sql`](supabase/schema.sql)

### Step 2 — Configure `.env.local`

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_USE_SUPABASE=true
```

Restart dev server.

### Step 3 — Export your local data

Choose **one** path:

#### Option A — From the running app (your real local edits)

1. Top bar → **⬇ Backup** → saves `ant-crm-backup-YYYY-MM-DD.json`
2. Convert to SQL:

```bash
npm run supabase:sql -- path/to/ant-crm-backup-2026-06-14.json supabase/import-full-data.sql
```

3. Run `supabase/import-full-data.sql` in Supabase SQL Editor.

#### Option B — Default seed dataset (no browser needed)

```bash
npm run supabase:export-seeds
```

Creates:

- `supabase/seed-backup.json` — full JSON snapshot
- `supabase/import-full-data.sql` — ready to paste in SQL Editor

#### Option C — Push from the app (no SQL file)

1. Open app with `USE_SUPABASE=true`
2. Click bottom-left **☁ Supabase** banner → open panel
3. **Test connection** → should show green ✓
4. **Push full snapshot** → uploads all tables
5. **Verify counts** → local vs remote must match
6. **Hoàn tất migration** → clears `localStorage`, reloads from Supabase

### Step 4 — Verify connection

In the app migration panel (☁ banner):

| Action | What it checks |
|--------|----------------|
| **Test connection** | URL + anon key, latency, row counts per table |
| **Verify counts** | Compares browser store vs Supabase row counts |
| **☁ Supabase loaded** | On reload, data hydrated from remote |

Green dot + `✓ Kết nối OK (XXms)` = connected.

### Step 5 — Remove old local-only cache

After push + verify:

- Click **Hoàn tất migration** in the panel, **or**
- DevTools → Application → Local Storage → delete `ant-crm-v43`

After migration, localStorage is only a **cache** of Supabase data (Zustand persist), not a separate source.

### What happens to local data?

| Phase | Behaviour |
|-------|-----------|
| Before migration | Data in `localStorage` key `ant-crm-v43` |
| Push snapshot | All entities copied to Supabase |
| Empty Supabase on load | Keeps local/seeds (safe) |
| Supabase has rows on load | Remote replaces store, then re-saved to localStorage |
| After "Hoàn tất migration" | localStorage cleared once, then repopulated from Supabase |

You do **not** need manual CSV import if you use Push snapshot or `import-full-data.sql`.

---

## Backup / restore (always useful)

- **⬇ Backup** (top bar) → JSON with full CRM state (all tables).
- **⬆ Restore** → replace local store from JSON.

Keep a backup file before migration as safety net.

## Architecture

```
index.html              # Source of truth for CSS & seeds (reference)
app/globals.css         # Extracted styles
lib/seeds/              # Seed data extracted from HTML
lib/store.ts            # Zustand + persist (ant-crm-v43)
lib/db/sync-config.ts   # Table ↔ store mapping
lib/db/supabase.ts      # Supabase adapter (all entities)
lib/db/hydrate.ts       # Load / push / verify / migrate
supabase/schema.sql     # Create all tables + RLS
supabase/import-full-data.sql  # Generated import (npm run supabase:export-seeds)
components/             # Page UI (26 routes)
```

Re-extract after HTML updates:

```bash
npm run extract
npm run supabase:export-seeds   # refresh SQL import from seeds
```

## Pages (26 routes)

`/dashboard` · `/planner` · `/customers` · `/agents` · `/sales` · `/tourdesign` · `/products` · `/gallery` · `/pricing` · `/bookings` · `/contracts` · `/suppliers` · `/guides` · `/weather` · `/attractions` · `/posttour` · `/finance` · `/tax` · `/salary` · `/about` · `/culture` · `/regulations` · `/hr` · `/ai` · `/devnotes` · `/teamchat`

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run extract` | Re-generate seeds/CSS from `index.html` |
| `npm run supabase:export-seeds` | Generate `seed-backup.json` + `import-full-data.sql` from seeds |
| `npm run supabase:sql -- <backup.json> [out.sql]` | Convert app backup JSON → Supabase SQL |

## Logo

`public/Logo-3.svg` (or add `Logo-3.png`).
