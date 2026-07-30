# supabase/ — Agent overview

## Role
PostgreSQL v5 schema, seed/import SQL, RLS, CLI migrations (`migrations/`), and legacy `migrate-*.sql` patches.

## Contents
- `schema.sql`, `reset-v5.sql`, `import-v5-data.sql`, `verify-counts-v5.sql`
- `config.toml` — Supabase CLI config (`supabase init`)
- `migrations/` — **primary** dated incremental SQL (CLI)
- `LEGACY-MIGRATIONS.md` — status of flat `migrate-*.sql` patches
- Flat `migrate-*.sql` — legacy feature patches (do not add new)
- `rls-authenticated.sql`, photo wipe helpers

## Boundaries
- Document setup in `docs/SUPABASE-SETUP.md` §9. Do not put app TypeScript here.
