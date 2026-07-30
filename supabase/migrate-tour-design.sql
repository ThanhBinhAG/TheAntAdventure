-- Incremental migration: Sales → Tour Design workflow
-- Run on existing v5 DB without full reset.

alter table customers add column if not exists adults smallint default 2;
alter table customers add column if not exists first_time text;
alter table customers add column if not exists intl_flights text;
alter table customers add column if not exists child_ages text;
alter table customers add column if not exists child_diet text;
alter table customers add column if not exists child_prefs text;

alter table leads add column if not exists needs_tour_design boolean default false;
alter table leads add column if not exists tour_design_acked boolean default false;

create table if not exists tour_drafts (
  id                  text primary key,
  lead_id             text        unique references leads(id) on delete cascade,
  cust_id             text        references customers(id) on delete cascade,
  brief_json          jsonb,
  outline_status      text        default 'draft',
  selected_codes      text[],
  selected_package_id text,
  markup_pct          numeric(5,2) default 30,
  client_type         text        default 'b2c',
  current_step        smallint    default 0,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now(),
  constraint chk_outline_status check (outline_status in ('draft', 'sent', 'approved'))
);

create table if not exists tour_outline_days (
  id              uuid        primary key default gen_random_uuid(),
  draft_id        text        not null references tour_drafts(id) on delete cascade,
  day_number      smallint    not null,
  outline_date    date,
  location        text,
  activities      text,
  hotels          text,
  sort_order      smallint    default 0,
  constraint uq_tour_outline_day unique (draft_id, day_number)
);

create index if not exists idx_leads_needs_tour_design on leads(needs_tour_design) where needs_tour_design = true;
create index if not exists idx_tour_drafts_lead_id on tour_drafts(lead_id);
create index if not exists idx_tour_drafts_cust_id on tour_drafts(cust_id);
create index if not exists idx_tour_outline_days_draft on tour_outline_days(draft_id);

alter table tour_drafts enable row level security;
alter table tour_outline_days enable row level security;
drop policy if exists dev_allow_all on tour_drafts;
create policy dev_allow_all on tour_drafts for all using (true) with check (true);
drop policy if exists dev_allow_all on tour_outline_days;
create policy dev_allow_all on tour_outline_days for all using (true) with check (true);

drop trigger if exists trg_updated_at on tour_drafts;
create trigger trg_updated_at before update on tour_drafts
  for each row execute procedure set_updated_at();
