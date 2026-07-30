-- Fix: product_photos RLS enabled without a policy
-- =============================================================================
-- Symptom: Tour Product photo links vanish on refresh; console / toast shows
--   new row violates row-level security policy for table "product_photos"
-- Cause: migrate-photo-library.sql enabled RLS on product_photos but did not
--   create authenticated_access (Storage upload still succeeds — only the
--   junction-table insert fails).
-- Run once in Supabase SQL Editor (logged-in CRM uses role `authenticated`).
-- =============================================================================

alter table product_photos enable row level security;
drop policy if exists dev_allow_all on product_photos;
drop policy if exists authenticated_access on product_photos;
create policy authenticated_access on product_photos
  for all to authenticated
  using (true)
  with check (true);

-- Optional check (should return 1 row):
-- select policyname, roles, cmd
-- from pg_policies
-- where tablename = 'product_photos';
