-- Company-wide proposal copy is read with Tour Design access and written only by Tour Design editors.
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
