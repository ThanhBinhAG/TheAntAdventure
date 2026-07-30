# supabase/migrations/ — Agent overview

## Role
**Primary** schema changes via Supabase CLI (`supabase migration new` → `db push`).

## Contents
- `20260101000000_baseline_v5_schema.sql` — full v5 DDL (squashed baseline)
- Timestamped `.sql` files from `npm run db:migration:new`

## Workflow
1. `npm run db:migration:new -- feature_name`
2. Edit SQL (idempotent DDL preferred)
3. `npm run db:push` on DEV (`SUPABASE_DB_URL` in `.env.local`)
4. Mirror changes in `../schema.sql` for SQL Editor fresh installs
5. Existing remote with schema already applied: `npm run db:bootstrap` once (marks baseline applied)

## Boundaries
- Do not re-introduce flat `legacy/migrate-*.sql` patches
- Setup docs: `docs/SUPABASE-SETUP.md` §9
- Helper: `scripts/supabase-db.sh`
