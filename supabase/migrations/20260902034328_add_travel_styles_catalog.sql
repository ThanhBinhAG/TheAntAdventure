create table if not exists public.travel_styles (
  code text primary key check (code ~ '^[a-z0-9][a-z0-9-]{0,79}$'),
  label text not null check (length(trim(label)) between 1 and 100),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists travel_styles_label_unique
  on public.travel_styles (lower(label));

insert into public.travel_styles (code, label, sort_order, is_active)
values
  ('luxury', 'Luxury', 10, true),
  ('premium-cultural', 'Premium Cultural', 20, true),
  ('cultural', 'Cultural', 30, true),
  ('adventure', 'Adventure', 40, true),
  ('family', 'Family', 50, true),
  ('culinary', 'Culinary', 60, true),
  ('photography', 'Photography', 70, true),
  ('honeymoon', 'Honeymoon', 80, true)
on conflict (code) do nothing;

alter table public.travel_styles enable row level security;
revoke all on table public.travel_styles from anon, authenticated;
grant select, insert, update on table public.travel_styles to authenticated;

drop policy if exists rls_travel_styles_select on public.travel_styles;
drop policy if exists rls_travel_styles_insert on public.travel_styles;
drop policy if exists rls_travel_styles_update on public.travel_styles;

create policy rls_travel_styles_select on public.travel_styles
  for select to authenticated using (public.has_permission('customers.write'));
create policy rls_travel_styles_insert on public.travel_styles
  for insert to authenticated with check (public.has_permission('customers.write'));
create policy rls_travel_styles_update on public.travel_styles
  for update to authenticated
  using (public.has_permission('customers.write'))
  with check (public.has_permission('customers.write'));
