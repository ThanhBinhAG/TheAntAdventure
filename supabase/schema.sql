-- The Ant Adventures CRM v4.3 — Full Supabase schema
-- Run once in: Supabase Dashboard → SQL → New query → Run
--
-- Each row stores the full CRM object as JSON (matches Zustand / backup export shape).
-- Import options:
--   A) App → ☁ Migration panel → Push full snapshot
--   B) Run generated file: supabase/import-full-data.sql (from npm run supabase:sql)

-- ── Array entity tables ─────────────────────────────────────────────────────

create table if not exists customers (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

create table if not exists comms (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

create table if not exists leads (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

create table if not exists bookings (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

create table if not exists agents (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

create table if not exists guides (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

create table if not exists products (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

create table if not exists finance (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

create table if not exists ar (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

create table if not exists ap (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

create table if not exists tax (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

create table if not exists staff (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

create table if not exists tasks (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

create table if not exists feedback (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

create table if not exists contracts (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

create table if not exists photos (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

create table if not exists cal_events (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

create table if not exists dev_notes (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

create table if not exists cruises (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

create table if not exists transport (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

create table if not exists restaurants (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

create table if not exists special_suppliers (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

-- Team chat channels — single row id='default', data = { channel: Message[] }
create table if not exists crm_messages (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

-- Useful indexes for JSON queries
create index if not exists customers_data_gin on customers using gin (data);
create index if not exists leads_data_gin on leads using gin (data);
create index if not exists bookings_data_gin on bookings using gin (data);

-- ── RLS (development — tighten before production) ───────────────────────────

do $$
declare
  t text;
begin
  foreach t in array array[
    'customers','comms','leads','bookings','agents','guides','products',
    'finance','ar','ap','tax','staff','tasks','feedback','contracts','photos',
    'cal_events','dev_notes','cruises','transport','restaurants','special_suppliers',
    'crm_messages'
  ] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists anon_all_%I on %I', t, t);
    execute format(
      'create policy anon_all_%I on %I for all using (true) with check (true)',
      t, t
    );
  end loop;
end $$;
