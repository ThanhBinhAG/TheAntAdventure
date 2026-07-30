-- Baseline v5 schema — applied before Supabase CLI adoption.
-- Fresh installs: run supabase/schema.sql in SQL Editor (or db reset on local).
-- Existing remote DB: mark this migration applied without re-running:
--   npx supabase migration repair --status applied 20260101000000 --db-url "$SUPABASE_DB_URL"
--
-- No DDL here — remote already has tables from schema.sql + legacy migrate-*.sql patches.

SELECT 1;
