-- Company branding (singleton): sidebar logo URL shared across CRM users.
create table if not exists public.company_branding (
  id text primary key,
  logo_url text,
  updated_at timestamptz not null default now()
);

alter table public.company_branding enable row level security;

grant select, insert, update, delete on public.company_branding to anon;
grant select, insert, update, delete on public.company_branding to authenticated;
grant all on public.company_branding to service_role;

drop policy if exists authenticated_access on public.company_branding;
create policy authenticated_access on public.company_branding
  for all
  to authenticated
  using (true)
  with check (true);

insert into public.company_branding (id, logo_url)
values ('default', null)
on conflict (id) do nothing;
