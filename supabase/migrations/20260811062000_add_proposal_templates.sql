-- Company proposal templates (singleton per B2C/B2B variant).
-- fields jsonb holds commercial/legal copy; empty object = use system boilerplate.
create table if not exists public.proposal_templates (
  id text primary key check (id in ('b2c', 'b2b')),
  fields jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.proposal_templates enable row level security;

grant select, insert, update, delete on public.proposal_templates to anon;
grant select, insert, update, delete on public.proposal_templates to authenticated;
grant all on public.proposal_templates to service_role;

drop policy if exists authenticated_access on public.proposal_templates;
create policy authenticated_access on public.proposal_templates
  for all
  to authenticated
  using (true)
  with check (true);

insert into public.proposal_templates (id, fields)
values ('b2c', '{}'::jsonb), ('b2b', '{}'::jsonb)
on conflict (id) do nothing;

drop trigger if exists trg_updated_at on public.proposal_templates;
create trigger trg_updated_at before update on public.proposal_templates
  for each row execute procedure set_updated_at();
