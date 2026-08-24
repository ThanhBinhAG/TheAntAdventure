-- =============================================================================
-- The Ant Adventures CRM — Production RLS (authenticated users only)
-- =============================================================================
--
-- PREREQUISITES (run in this order):
--   1. Supabase Auth users created (Dashboard → Authentication → Users)
--   2. App login + middleware deployed and verified
--   3. Then run this script in SQL Editor
--
-- Effect:
--   - Drops dev_allow_all (open anon access)
--   - Grants full CRM access to role `authenticated` only
--   - Role `anon` has no policies → all direct API access denied
--
-- Shared CRM model: all logged-in users see the same data (no per-user rows).
-- =============================================================================

do $$
declare
  t text;
begin
  foreach t in array array[
    'agents','customers','products','product_pricing','guides','guide_reviews','leads',
    'tour_drafts','tour_outline_days',
    'bookings','booking_changes','booking_itinerary','booking_activities',
    'comms','finance','accounts_receivable','accounts_payable','tax_reports',
    'staff','salary_records','tasks','contracts','feedback',
    'suppliers','supplier_tags','cruises','transport','restaurants',
    'hotels','hotel_rooms',
    'photo_folders','photos','photo_tags','product_photos','attractions','attraction_photos','cal_events',
    'company_branding',
    'chat_channels','chat_messages','chat_reactions','dev_notes',
    'pricing_settings','pricing_ess_products','pricing_ess_cost_lines','pricing_ess_services',
    'pricing_ess_car_rates','pricing_ess_hotel_rates','pricing_ess_notes',
    'pricing_acc_properties','pricing_acc_room_rates','pricing_acc_cruise_rates',
    'pricing_catalog_imports',
    -- Weather tables: cron/API use service role (bypasses RLS). Policies here only
    -- block anon-key direct access after dropping leftover dev_allow_all.
    'weather_forecast_cache','weather_fetch_log'
  ] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists dev_allow_all on %I', t);
    execute format('drop policy if exists authenticated_access on %I', t);
    execute format(
      'create policy authenticated_access on %I for all to authenticated using (true) with check (true)',
      t
    );
  end loop;
end $$;

-- Proposal templates follow the same Tour Design permission model as their BFF.
alter table public.proposal_templates enable row level security;
revoke all on table public.proposal_templates from anon;
revoke all on table public.proposal_templates from authenticated;
grant select on table public.proposal_templates to authenticated;
grant insert, update on table public.proposal_templates to authenticated;

drop policy if exists dev_allow_all on public.proposal_templates;
drop policy if exists authenticated_access on public.proposal_templates;
drop policy if exists rls_proposal_templates_select on public.proposal_templates;
drop policy if exists rls_proposal_templates_insert on public.proposal_templates;
drop policy if exists rls_proposal_templates_update on public.proposal_templates;

create policy rls_proposal_templates_select on public.proposal_templates
  for select to authenticated
  using (public.has_permission('tour_design.read'));

create policy rls_proposal_templates_insert on public.proposal_templates
  for insert to authenticated
  with check (public.has_permission('tour_design.write'));

create policy rls_proposal_templates_update on public.proposal_templates
  for update to authenticated
  using (public.has_permission('tour_design.write'))
  with check (public.has_permission('tour_design.write'));
