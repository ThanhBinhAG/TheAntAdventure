# supabase/ — Agent overview

## Role
PostgreSQL v5 schema, seed/import SQL, RLS, and CLI migrations (`migrations/`).

## Contents
- `schema.sql` — SQL Editor mirror of baseline DDL (keep in sync with migrations)
- `migrations/20260101000000_baseline_v5_schema.sql` — CLI baseline (full schema)
- `reset-v5.sql`, `import-v5-data.sql`, `verify-counts-v5.sql`
- `rls-authenticated.sql`, `fix-product-photos-rls.sql`, `wipe-photo-library.sql`
- `config.toml` — Supabase CLI config
- `legacy/` — archive note only (pre-CLI patches removed)

## Colleague run order
1. (optional) `reset-v5.sql` → 2. `schema.sql` (or `db:push`) → 3. `import-v5-data.sql` → 4. verify → 5. Auth → 6. `rls-authenticated.sql`

## Boundaries
- New DDL only via `npm run db:migration:new` → `db:push`; mirror into `schema.sql`.
- Docs: `docs/SUPABASE-SETUP.md` §1 + §9. Do not put app TypeScript here.
