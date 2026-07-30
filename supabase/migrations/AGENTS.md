# supabase/migrations/ — Agent overview

## Role
**Primary** incremental schema changes via Supabase CLI (`supabase migration new` → `db push`).

## Contents
- `20260101000000_baseline_v5_schema.sql` — no-op marker for pre-CLI schema
- `20260711_bookings_lead_id.sql`, `20260713_products_notes_to_sales.sql` — incremental patches
- Timestamped `.sql` files created by `npm run db:migration:new`

## Workflow
1. `npm run db:migration:new -- feature_name`
2. Edit SQL (idempotent DDL preferred)
3. `npm run db:push` on DEV (`SUPABASE_DB_URL` in `.env.local`)
4. Mirror changes in `../schema.sql` for fresh installs

## Boundaries
- Legacy flat patches: `../migrate-*.sql` (see `../LEGACY-MIGRATIONS.md`) — do not add new files there
- Setup docs: `docs/SUPABASE-SETUP.md` §9
- Helper script: `scripts/supabase-db.sh`
