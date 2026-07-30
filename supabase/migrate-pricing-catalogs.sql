-- =============================================================================
--  Pricing catalogs — Essentials + Accommodation & Cruises
-- =============================================================================
--  Backs the two new Pricing sub-pages. Rows mirror the source Excel workbooks
--  so an imported sheet can be rendered in the same shape it was authored in.
--  Imports are replace-all: every table is cleared per workbook, then refilled.
--
--  Run in Supabase SQL Editor. Safe to re-run.
-- =============================================================================

-- Shared inputs (exchange rate, markup, VAT) for either workbook
create table if not exists pricing_settings (
  id              text primary key,
  workbook        text not null check (workbook in ('essentials', 'accommodation')),
  sheet           text not null default '',
  key             text not null,
  label           text not null default '',
  value_num       numeric,
  value_text      text default '',
  sort_order      smallint default 0,
  updated_at      timestamptz default now()
);

-- ------------------------------------------------------------- Essentials

create table if not exists pricing_ess_products (
  code            text primary key,
  seq             smallint default 0,
  category        text default '',
  name            text not null,
  duration_days   numeric,
  overnight       text default '',
  journeys        text default '',
  incl_7s         text default '',
  incl_16s        text default '',
  incl_29s        text default '',
  incl_35s        text default '',
  guide_main      numeric,
  guide_assistant numeric,
  guide_overnight numeric,
  truck_price     numeric,
  sort_order      smallint default 0,
  updated_at      timestamptz default now()
);

-- One row per cost-builder line; p1..p20 mirror the pax columns C..V
create table if not exists pricing_ess_cost_lines (
  id              text primary key,
  product_code    text not null references pricing_ess_products(code) on delete cascade,
  group_label     text default '',
  label           text not null,
  kind            text not null default 'component'
                    check (kind in ('component', 'hotel', 'selling_group', 'selling_pax', 'surcharge')),
  p1  numeric, p2  numeric, p3  numeric, p4  numeric, p5  numeric,
  p6  numeric, p7  numeric, p8  numeric, p9  numeric, p10 numeric,
  p11 numeric, p12 numeric, p13 numeric, p14 numeric, p15 numeric,
  p16 numeric, p17 numeric, p18 numeric, p19 numeric, p20 numeric,
  sort_order      smallint default 0,
  updated_at      timestamptz default now()
);

create table if not exists pricing_ess_services (
  id              text primary key,
  block           text default '',
  label           text not null,
  unit            text default '',
  amount          numeric,
  amount2         numeric,
  notes           text default '',
  sort_order      smallint default 0,
  updated_at      timestamptz default now()
);

create table if not exists pricing_ess_car_rates (
  id              text primary key,
  category        text default '',
  tour_title      text default '',
  route           text default '',
  km              numeric,
  duration        text default '',
  s7              numeric,
  s16             numeric,
  s29             numeric,
  s35             numeric,
  s45             numeric,
  sort_order      smallint default 0,
  updated_at      timestamptz default now()
);

create table if not exists pricing_ess_hotel_rates (
  id              text primary key,
  sheet           text not null default '',
  property        text default '',
  section         text default '',
  room_type       text not null,
  variant_a       text default '',
  variant_b       text default '',
  vnd_a           numeric,
  vnd_b           numeric,
  usd_a           numeric,
  usd_b           numeric,
  sell_a          numeric,
  sell_b          numeric,
  notes           text default '',
  sort_order      smallint default 0,
  updated_at      timestamptz default now()
);

-- Free-text sheets: pricing guidelines, provider notes, unstructured hotels
create table if not exists pricing_ess_notes (
  id              text primary key,
  sheet           text not null default '',
  section         text default '',
  label           text default '',
  detail          text default '',
  sort_order      smallint default 0,
  updated_at      timestamptz default now()
);

-- -------------------------------------------------- Accommodation & Cruises

create table if not exists pricing_acc_properties (
  id                    text primary key,
  region                text default '',
  location              text default '',
  name                  text not null,
  website               text default '',
  address               text default '',
  ownership             text default '',
  stars                 text default '',
  type                  text default '',
  reservations_contact  text default '',
  sales_contact         text default '',
  factsheet_link        text default '',
  contract_renewal      text default '',
  bank_account          text default '',
  approved              text default '',
  sort_order            smallint default 0,
  updated_at            timestamptz default now()
);

create table if not exists pricing_acc_room_rates (
  id              text primary key,
  sheet           text not null default '',
  location        text default '',
  property_name   text not null,
  room_type       text not null,
  season          text default '',
  period_from     text default '',
  period_to       text default '',
  year_label      text default '',
  vnd_cost        numeric,
  usd_cost        numeric,
  sell_price      numeric,
  margin          numeric,
  notes           text default '',
  sort_order      integer default 0,
  updated_at      timestamptz default now()
);

create table if not exists pricing_acc_cruise_rates (
  id              text primary key,
  sheet           text not null default '',
  region          text default '',
  location        text default '',
  property_name   text not null,
  stars           text default '',
  type            text default 'Cruise',
  room_type       text default '',
  phone           text default '',
  email           text default '',
  cost_2026       numeric,
  cost_2027       numeric,
  sell_2026       numeric,
  sell_2027       numeric,
  markup_pct      numeric,
  margin          numeric,
  sort_order      smallint default 0,
  updated_at      timestamptz default now()
);

-- Audit trail of workbook imports
create table if not exists pricing_catalog_imports (
  id              text primary key,
  workbook        text not null check (workbook in ('essentials', 'accommodation')),
  file_name       text not null,
  sheet_count     smallint default 0,
  row_count       integer default 0,
  warning_count   smallint default 0,
  imported_at     timestamptz default now()
);

create index if not exists idx_pricing_settings_workbook on pricing_settings(workbook);
create index if not exists idx_pricing_cost_lines_product on pricing_ess_cost_lines(product_code);
create index if not exists idx_pricing_hotel_rates_sheet on pricing_ess_hotel_rates(sheet);
create index if not exists idx_pricing_notes_sheet on pricing_ess_notes(sheet);
create index if not exists idx_pricing_acc_props_region on pricing_acc_properties(region);
create index if not exists idx_pricing_acc_props_type on pricing_acc_properties(type);
create index if not exists idx_pricing_acc_rates_sheet on pricing_acc_room_rates(sheet);
create index if not exists idx_pricing_acc_rates_property on pricing_acc_room_rates(property_name);
create index if not exists idx_pricing_acc_cruise_sheet on pricing_acc_cruise_rates(sheet);
create index if not exists idx_pricing_imports_workbook on pricing_catalog_imports(workbook, imported_at desc);

-- RLS: same shared-CRM model as the rest of the schema
do $$
declare
  t text;
begin
  foreach t in array array[
    'pricing_settings','pricing_ess_products','pricing_ess_cost_lines','pricing_ess_services',
    'pricing_ess_car_rates','pricing_ess_hotel_rates','pricing_ess_notes',
    'pricing_acc_properties','pricing_acc_room_rates','pricing_acc_cruise_rates',
    'pricing_catalog_imports'
  ] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists dev_allow_all on %I', t);
    execute format('create policy dev_allow_all on %I for all using (true) with check (true)', t);
  end loop;
end $$;
