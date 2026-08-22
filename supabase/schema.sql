-- ============================================================
--  THE ANT ADVENTURES CRM — PostgreSQL Schema v5.0
--  Supabase-ready · Fully relational · No JSONB
--
--  Documentation: docs/DATABASE.md · docs/SUPABASE-SETUP.md
--
--  Keep in sync with:
--    supabase/migrations/20260101000000_baseline_v5_schema.sql
--  Prefer editing the migration, then copy here for SQL Editor paste.
--
--  Run order (new Supabase project — SQL Editor):
--    1. (optional DEV) reset-v5.sql
--    2. This file (schema) — one run, do not split
--    3. import-v5-data.sql
--    4. verify-counts-v5.sql (optional)
--    5. Auth + app config
--    6. rls-authenticated.sql
-- ============================================================

create extension if not exists "pgcrypto";

-- Private server-owned CRM sessions. Browser roles receive no grants to this table.
create table if not exists crm_sessions (
  sid text primary key,
  payload_ciphertext text not null,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_crm_sessions_active_expiry
  on crm_sessions (expires_at) where revoked_at is null;
alter table crm_sessions enable row level security;
comment on table crm_sessions is
  'Private server-owned CRM sessions. Payload is AES-GCM ciphertext; only the server service role may access it.';

-- ============================================================
--  MODULE 1 · AGENTS & CUSTOMERS (B2B / B2C)
-- ============================================================

create table if not exists agents (
  id              text primary key,                -- AGT-001
  name            text        not null,
  country         text,
  tier            text,                            -- Platinum | Gold | Silver | Bronze | Direct
  commission_pct  numeric(5,2) default 0,
  contact_name    text,
  email           text,
  phone           text,
  currency        text        default 'USD',
  status          text        default 'Active',
  notes           text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create table if not exists customers (
  id              text primary key,                -- CUS-26-001
  name            text        not null,
  email           text,
  phone           text,
  whatsapp        text,
  country         text,
  nationality     text,                            -- app: nat
  source          text,
  travel_style    text,                            -- app: style
  language        text,                            -- app: lang
  client_type     text        default 'b2c',       -- b2b | b2c
  agent_id        text        references agents(id) on delete set null,
  salesperson     text,
  hotel_tier      text,
  budget          text,
  travel_month    text,
  children        smallint    default 0,
  adults          smallint    default 2,
  first_time      text,
  intl_flights    text,
  child_ages      text,
  child_diet      text,
  child_prefs     text,
  flights         text,
  visa_status     text,
  interests       text,
  donts           text,
  notes           text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- ============================================================
--  MODULE 2 · PRODUCTS (Tour catalogue)
-- ============================================================

create table if not exists products (
  code            text primary key,                -- PRD-N-001 (app PK = code)
  name            text        not null,
  logic           text,
  duration        text,                            -- app: dur  e.g. 8D/7N
  category        text,                            -- app: cat
  destination     text,                            -- app: dest
  level           text,                            -- app: lvl
  description     text,                            -- app: desc
  usp             text,
  notes_to_sales  text,                            -- app: notesToSales (staff-only)
  price_from      text,                            -- app: price (display string)
  region          text,                            -- north | central | south | national
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create table if not exists product_pricing (
  product_code    text primary key references products(code) on delete cascade,
  std_cost        numeric default 0,
  p1              numeric default 0,
  p2              numeric default 0,
  p3              numeric default 0,
  p4              numeric default 0,
  p5              numeric default 0,
  p6              numeric default 0,
  p7              numeric default 0,
  p8              numeric default 0,
  p9              numeric default 0,
  p10             numeric default 0,
  c1              numeric default 0,
  c2              numeric default 0,
  c3              numeric default 0,
  c4              numeric default 0,
  c5              numeric default 0,
  c6              numeric default 0,
  c7              numeric default 0,
  c8              numeric default 0,
  c9              numeric default 0,
  c10             numeric default 0,
  incl_guide      boolean default false,
  incl_transport  boolean default false,
  incl_tickets    boolean default false,
  incl_water      boolean default false,
  incl_meals      boolean default false,
  updated_at      timestamptz default now()
);

-- ============================================================
--  MODULE 3 · GUIDES
-- ============================================================

create table if not exists guides (
  id              text primary key,                -- G-N01
  full_name       text        not null,            -- app: fullname
  english_name    text,                            -- app: ename
  region          text,
  languages       text,                            -- app: langs (comma-separated)
  specialty       text,
  license_number  text,                            -- app: license
  daily_rate      numeric(10,2) default 0,         -- app: rate
  rating          text,
  status          text        default 'Active',
  photo_url       text,                            -- app: photo
  years_exp       smallint    default 0,           -- app: years
  location        text,
  phone           text,
  email           text,
  shirt_size      text,                            -- app: shirtSize
  bank_account    text,                            -- app: bankAccount
  address         text,
  bio             text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create table if not exists guide_reviews (
  id              uuid        primary key default gen_random_uuid(),
  guide_id        text        not null references guides(id) on delete cascade,
  booking_id      text,                            -- FK added after bookings
  reviewer_name   text,
  rating          smallint,
  comment         text,
  review_date     date
);

-- ============================================================
--  MODULE 4 · LEADS (Sales pipeline)
-- ============================================================

create table if not exists leads (
  id              text primary key,
  cust_id         text        references customers(id) on delete cascade,
  tour            text,
  pax             smallint    default 1,
  value           numeric(12,2) default 0,
  currency        text        default 'USD',
  month           text,
  stage           text        default 'Inquiry',
  owner           text,
  follow_up_date  date,                            -- app: followUpDate
  next_action     text,                            -- app: nextAction
  probability     smallint    default 0,
  client_type     text,
  notes           text,
  needs_tour_design boolean   default false,
  tour_design_acked boolean   default false,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now(),
  constraint chk_leads_stage check (stage in (
    'Inquiry','Designing','Quoted','Negotiation',
    'Confirmed','On Tour','Completed','Lost','Pending'
  ))
);

-- ============================================================
--  MODULE 4b · TOUR DESIGN DRAFTS
-- ============================================================

create table if not exists tour_drafts (
  id                  text primary key,
  lead_id             text        unique references leads(id) on delete cascade,
  cust_id             text        references customers(id) on delete cascade,
  brief_json          jsonb,
  outline_status      text        default 'draft',
  outline_notes       text,
  outline_sent_at     timestamptz,
  outline_approved_at timestamptz,
  outline_revision    smallint    default 0,
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

create or replace function public.save_tour_design_transaction(
  p_draft jsonb,
  p_outline_days jsonb
)
returns void
language plpgsql
security invoker
set search_path = public
as $function$
declare
  v_draft_id text := p_draft ->> 'id';
begin
  if jsonb_typeof(p_draft) <> 'object' or coalesce(v_draft_id, '') = '' then
    raise exception 'Tour draft payload is invalid' using errcode = '22023';
  end if;
  if jsonb_typeof(p_outline_days) <> 'array' then
    raise exception 'Tour outline payload must be an array' using errcode = '22023';
  end if;
  if exists (
    select 1
    from jsonb_array_elements(p_outline_days) as day
    where coalesce(day ->> 'draft_id', '') <> v_draft_id
  ) then
    raise exception 'Every outline day must belong to the draft' using errcode = '22023';
  end if;
  if exists (
    select 1
    from jsonb_array_elements(p_outline_days) as day
    group by day ->> 'day_number'
    having count(*) > 1
  ) then
    raise exception 'Outline day numbers must be unique' using errcode = '22023';
  end if;

  insert into public.tour_drafts (
    id, lead_id, cust_id, brief_json, outline_status, outline_notes,
    outline_sent_at, outline_approved_at, outline_revision, selected_codes,
    selected_package_id, markup_pct, client_type, current_step
  ) values (
    v_draft_id,
    nullif(p_draft ->> 'lead_id', ''),
    nullif(p_draft ->> 'cust_id', ''),
    nullif(p_draft -> 'brief_json', 'null'::jsonb),
    coalesce(nullif(p_draft ->> 'outline_status', ''), 'draft'),
    nullif(p_draft ->> 'outline_notes', ''),
    nullif(p_draft ->> 'outline_sent_at', '')::timestamptz,
    nullif(p_draft ->> 'outline_approved_at', '')::timestamptz,
    coalesce(nullif(p_draft ->> 'outline_revision', '')::smallint, 0),
    case
      when p_draft -> 'selected_codes' is null or p_draft -> 'selected_codes' = 'null'::jsonb then null
      else array(select jsonb_array_elements_text(p_draft -> 'selected_codes'))
    end,
    nullif(p_draft ->> 'selected_package_id', ''),
    coalesce(nullif(p_draft ->> 'markup_pct', '')::numeric, 30),
    coalesce(nullif(p_draft ->> 'client_type', ''), 'b2c'),
    coalesce(nullif(p_draft ->> 'current_step', '')::smallint, 0)
  )
  on conflict (id) do update set
    lead_id = excluded.lead_id,
    cust_id = excluded.cust_id,
    brief_json = excluded.brief_json,
    outline_status = excluded.outline_status,
    outline_notes = excluded.outline_notes,
    outline_sent_at = excluded.outline_sent_at,
    outline_approved_at = excluded.outline_approved_at,
    outline_revision = excluded.outline_revision,
    selected_codes = excluded.selected_codes,
    selected_package_id = excluded.selected_package_id,
    markup_pct = excluded.markup_pct,
    client_type = excluded.client_type,
    current_step = excluded.current_step,
    updated_at = now();

  delete from public.tour_outline_days where draft_id = v_draft_id;

  insert into public.tour_outline_days (
    id, draft_id, day_number, outline_date, location, activities, hotels, sort_order
  )
  select
    (day ->> 'id')::uuid,
    v_draft_id,
    (day ->> 'day_number')::smallint,
    nullif(day ->> 'outline_date', '')::date,
    nullif(day ->> 'location', ''),
    nullif(day ->> 'activities', ''),
    nullif(day ->> 'hotels', ''),
    coalesce(nullif(day ->> 'sort_order', '')::smallint, (day ->> 'day_number')::smallint)
  from jsonb_array_elements(p_outline_days) as day;
end;
$function$;

revoke all on function public.save_tour_design_transaction(jsonb, jsonb) from public;
grant execute on function public.save_tour_design_transaction(jsonb, jsonb) to authenticated;

-- ============================================================
--  MODULE 5 · BOOKINGS & ITINERARY
-- ============================================================

create table if not exists bookings (
  id              text primary key,                -- BK-2026-001
  cust_id         text        references customers(id) on delete restrict,
  lead_id         text        references leads(id) on delete set null,
  tour            text        not null,
  pax             smallint    default 1,
  start_date      date,                            -- app: start (normalize on import)
  end_date        date,                            -- app: end
  total           numeric(12,2) default 0,
  deposit         numeric(12,2) default 0,
  status          text        default 'Confirmed',
  guide_id        text        references guides(id) on delete set null,
  guide_name      text,                            -- app: guide (denorm display)
  hotel           text,
  guide_alert_pending boolean default false,
  notes           text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

alter table guide_reviews
  drop constraint if exists fk_guide_reviews_booking;

alter table guide_reviews
  add constraint fk_guide_reviews_booking
  foreign key (booking_id) references bookings(id) on delete set null;

create table if not exists booking_changes (
  id              uuid        primary key default gen_random_uuid(),
  booking_id      text        not null references bookings(id) on delete cascade,
  changed_at      timestamptz default now(),
  changed_by      text,
  field_name      text,
  old_value       text,
  new_value       text,
  note            text
);

create table if not exists booking_itinerary (
  id              uuid        primary key default gen_random_uuid(),
  booking_id      text        not null references bookings(id) on delete cascade,
  day_number      smallint    not null,            -- app: day
  destination     text,                            -- app: dest
  hotel           text,
  sort_order      smallint    default 0,
  constraint uq_booking_day unique (booking_id, day_number)
);

create table if not exists booking_activities (
  id              uuid        primary key default gen_random_uuid(),
  itinerary_id    uuid        not null references booking_itinerary(id) on delete cascade,
  name            text        not null,
  category        text,                            -- app: cat
  sort_order      smallint    default 0
);

-- ============================================================
--  MODULE 6 · COMMUNICATIONS
-- ============================================================

create table if not exists comms (
  id              text primary key,
  cust_id         text references customers(id) on delete cascade,  -- app: cid
  comm_date       date not null,                   -- app: date
  type            text,
  direction       text default 'outbound',       -- app: dir inbound|outbound
  subject         text,                            -- app: subj
  body            text,
  author          text,
  created_at      timestamptz default now()
);

-- ============================================================
--  MODULE 7 · FINANCE
-- ============================================================

create table if not exists finance (
  id              text primary key,                -- FIN-2026-001
  booking_id      text references bookings(id) on delete set null,  -- app: bkid
  cust_name       text,
  type            text not null,                   -- Tour | Expense | Commission
  txn_date        date,                            -- app: date
  month           text,
  revenue         numeric(12,2) default 0,         -- app: rev
  cost            numeric(12,2) default 0,
  cash_in         numeric(12,2) default 0,         -- app: cashIn
  cash_out        numeric(12,2) default 0,         -- app: cashOut
  status          text default 'Pending',
  invoice_ref     text,                            -- app: inv
  notes           text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create table if not exists accounts_receivable (
  id              text primary key,                -- AR-2026-001
  finance_id      text references finance(id) on delete set null,   -- app: finId
  booking_id      text references bookings(id) on delete set null,
  cust_name       text,
  tour            text,
  invoice_amount  numeric(12,2) default 0,         -- app: invoiceAmt
  deposit_paid    numeric(12,2) default 0,         -- app: depositPaid
  balance         numeric(12,2) generated always as (invoice_amount - deposit_paid) stored,
  due_date        date,                            -- app: dueDate
  status          text default 'Outstanding',
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create table if not exists accounts_payable (
  id              text primary key,                -- AP-2026-001
  booking_id      text references bookings(id) on delete set null,
  supplier        text not null,
  description     text,
  amount          numeric(12,2) default 0,
  due_date        date,                            -- app: dueDate
  status          text default 'Pending',
  category        text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create table if not exists tax_reports (
  id              text primary key,                -- TAX-2026-001
  period          text not null,
  revenue         numeric(14,2) default 0,         -- app: rev
  expenses        numeric(14,2) default 0,
  vat_output      numeric(12,2) default 0,         -- app: vat_out
  vat_input       numeric(12,2) default 0,         -- app: vat_in
  vat_payable     numeric(12,2) generated always as (vat_output - vat_input) stored,
  profit_before_tax numeric(14,2) generated always as (revenue - expenses) stored,  -- app: profit_bt
  corp_tax        numeric(12,2) default 0,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- ============================================================
--  MODULE 8 · STAFF & HR
-- ============================================================

create table if not exists staff (
  id              text primary key,                -- STF-001
  name            text not null,
  english_name    text,                            -- app: ename
  department      text,                            -- app: dept
  position        text,                            -- app: pos
  phone           text,
  email           text,
  start_date      date,                            -- app: start
  contract_type   text default 'Full-time',        -- app: contract
  base_salary     numeric(10,2) default 0,         -- app: baseSalary
  status          text default 'Active',
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create table if not exists salary_records (
  id              uuid primary key default gen_random_uuid(),
  staff_id        text not null references staff(id) on delete cascade,
  month           text not null,
  base            numeric(10,2) default 0,
  bonus           numeric(10,2) default 0,
  deductions      numeric(10,2) default 0,
  net_pay         numeric(10,2) generated always as (base + bonus - deductions) stored,
  paid_date       date,
  status          text default 'Pending',
  notes           text
);

-- ============================================================
--  MODULE 9 · TASKS
-- ============================================================

create table if not exists tasks (
  id              text primary key,                -- TK-001
  title           text not null,
  assignee        text,
  due_date        date,                            -- app: date
  priority        text default 'medium',
  department      text,                            -- app: dept
  status          text default 'todo',
  booking_id      text references bookings(id) on delete set null,
  notes           text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- ============================================================
--  MODULE 10 · CONTRACTS
-- ============================================================

create table if not exists contracts (
  id              text primary key,                -- CTR-2026-001
  booking_id      text references bookings(id) on delete restrict,
  client_name     text not null,
  nationality     text,
  pax             smallint default 1,
  rooms           text,
  tour_name       text not null,
  duration        text,
  departure_date  date,
  return_date     date,
  route           text,
  inclusions      text,
  exclusions      text,
  flights_info    text,                            -- app: flights
  currency        text default 'USD',
  total           numeric(12,2) default 0,
  deposit_pct     smallint default 30,
  deposit_amount  numeric(12,2) default 0,         -- app: depositAmt
  balance_due_date date,
  status          text default 'Draft',
  created_at      date,
  signed_at       date,
  notes           text,
  updated_at      timestamptz default now()
);

-- ============================================================
--  MODULE 11 · FEEDBACK (Post-tour)
-- ============================================================

create table if not exists feedback (
  id              text primary key,                -- FB-001
  type            text default 'client',
  feedback_date   date,                            -- app: date
  booking_id      text references bookings(id) on delete set null,  -- app: bkid
  client_name     text,                            -- app: client
  nps             smallint,
  overall_rating  smallint,                        -- app: overall
  guide_rating    smallint,                        -- app: guide_r
  hotel_rating    smallint,                        -- app: hotel_r
  best_moment     text,                            -- app: best
  improvement     text,                            -- app: improve
  comments        text,
  would_return    text,                            -- app: again yes|maybe|no
  created_at      timestamptz default now()
);

-- ============================================================
--  MODULE 12 · SUPPLIERS
-- ============================================================

create table if not exists suppliers (
  id              text primary key,                -- LOG-V-001 / SUP-C-001
  category        text not null,                   -- app: cat
  subcategory     text,                            -- app: subcat
  name            text not null,
  english_name    text,                            -- app: ename
  contact_name    text,                            -- app: contact
  phone           text,
  email           text,
  location        text,
  region          text,
  rate            text,
  currency        text default 'USD',
  payment_terms   text,                            -- app: payment
  has_contract    boolean default false,           -- app: contract yes/no
  cancellation_policy text,                        -- app: cancel
  insurance_info  text,                            -- app: insurance
  availability    text,                            -- app: avail
  description     text,                            -- app: desc
  notes           text,
  rating          text,
  status          text default 'Active',
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create table if not exists supplier_tags (
  supplier_id     text not null references suppliers(id) on delete cascade,
  tag             text not null,
  primary key (supplier_id, tag)
);

-- Legacy quick-list tables (Suppliers page tabs) — optional link to suppliers
create table if not exists cruises (
  id              text primary key,
  supplier_id     text references suppliers(id) on delete set null,
  name            text not null,
  route           text,
  cabins          text,
  rate            text,
  valid_until     text,                            -- app: valid
  rating          text,
  notes           text,
  created_at      timestamptz default now()
);

create table if not exists transport (
  id              text primary key,
  supplier_id     text references suppliers(id) on delete set null,
  name            text not null,
  region          text,
  vehicles        text,
  rate            text,
  notes           text,
  created_at      timestamptz default now()
);

create table if not exists restaurants (
  id              text primary key,
  supplier_id     text references suppliers(id) on delete set null,
  name            text not null,
  city            text,
  cuisine         text,
  set_menu        text,                            -- app: set
  capacity        smallint,                        -- app: cap
  rating          text,
  notes           text,
  created_at      timestamptz default now()
);

create table if not exists hotels (
  id              text primary key,
  name            text not null,
  destination     text not null,
  category        text,
  stars           text,
  region          text not null,
  status          text default 'Active',
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create table if not exists hotel_rooms (
  id              text primary key,
  hotel_id        text not null references hotels(id) on delete cascade,
  room_type       text not null,
  view            text,
  sqm             smallint,
  low_mup         numeric,
  high_mup        numeric,
  festive_mup     numeric,
  peak_mup        numeric,
  low_net         numeric,
  high_net        numeric,
  festive_net     numeric,
  peak_net        numeric,
  sort_order      smallint default 0,
  created_at      timestamptz default now()
);

-- ============================================================
--  MODULE 13 · GALLERY
-- ============================================================

create table if not exists photo_folders (
  id              text primary key,                -- PF-unsorted, PF-001
  name            text not null,
  parent_id       text references photo_folders(id) on delete restrict,
  sort_order      smallint not null default 0,
  is_system       boolean not null default false,
  created_at      timestamptz not null default now()
);

create index if not exists idx_photo_folders_parent on photo_folders(parent_id);

insert into photo_folders (id, name, parent_id, sort_order, is_system)
values ('PF-unsorted', 'Unsorted', null, 0, true)
on conflict (id) do nothing;

create table if not exists photos (
  id              text primary key,                -- PH-001
  caption         text,
  region          text,
  url             text,                            -- display variant public URL
  thumb_url       text,                            -- thumbnail variant public URL
  storage_path    text,                            -- gallery/PH-001/display.webp
  display_bytes   integer,                         -- compressed display.webp size in bytes
  folder_id       text not null default 'PF-unsorted' references photo_folders(id) on delete restrict,
  created_at      timestamptz default now()
);

create index if not exists idx_photos_folder on photos(folder_id);

-- Shared CRM company logo (sidebar avatar); storage path branding/logo.webp
create table if not exists company_branding (
  id          text primary key,
  logo_url    text,
  updated_at  timestamptz not null default now()
);

insert into company_branding (id, logo_url)
values ('default', null)
on conflict (id) do nothing;

-- Shared proposal commercial/legal copy (one row per B2C/B2B). Empty fields = boilerplate.
create table if not exists proposal_templates (
  id          text primary key check (id in ('b2c', 'b2b')),
  fields      jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

insert into proposal_templates (id, fields)
values ('b2c', '{}'::jsonb), ('b2b', '{}'::jsonb)
on conflict (id) do nothing;

create table if not exists photo_tags (
  photo_id        text not null references photos(id) on delete cascade,
  tag             text not null,
  primary key (photo_id, tag)
);

-- Tour products link to library photos via junction (not ownership on photos)
create table if not exists product_photos (
  product_code    text not null references products(code) on delete cascade,
  photo_id        text not null references photos(id) on delete cascade,
  sort_order      smallint default 0,
  is_featured     boolean not null default false,
  primary key (product_code, photo_id)
);

-- Product import replaces the catalogue and required pricing stubs atomically.
create or replace function public.replace_product_catalogue_transaction(
  p_products jsonb,
  p_pricing_stubs jsonb
)
returns void language plpgsql security invoker set search_path = public as $function$
begin
  if jsonb_typeof(p_products) <> 'array' or jsonb_typeof(p_pricing_stubs) <> 'array' then
    raise exception 'Product import payloads must be arrays' using errcode = '22023';
  end if;
  if exists (select 1 from jsonb_to_recordset(p_products) as product(code text, name text, logic text, duration text, category text, destination text, level text, description text, usp text, notes_to_sales text, price_from text, region text) where coalesce(nullif(trim(product.code), ''), '') = '' or coalesce(nullif(trim(product.name), ''), '') = '') then
    raise exception 'Every imported product requires a code and name' using errcode = '22023';
  end if;
  if exists (select 1 from jsonb_to_recordset(p_products) as product(code text) group by product.code having count(*) > 1) then
    raise exception 'Imported product codes must be unique' using errcode = '22023';
  end if;
  if exists (select 1 from jsonb_to_recordset(p_pricing_stubs) as pricing(product_code text) where coalesce(nullif(trim(pricing.product_code), ''), '') = '') then
    raise exception 'Every pricing stub requires a product code' using errcode = '22023';
  end if;
  if exists (select 1 from jsonb_to_recordset(p_pricing_stubs) as pricing(product_code text) group by pricing.product_code having count(*) > 1) then
    raise exception 'Imported pricing product codes must be unique' using errcode = '22023';
  end if;
  if (select count(*) from jsonb_to_recordset(p_products) as product(code text)) <> (select count(*) from jsonb_to_recordset(p_pricing_stubs) as pricing(product_code text)) or exists (select 1 from jsonb_to_recordset(p_pricing_stubs) as pricing(product_code text) where not exists (select 1 from jsonb_to_recordset(p_products) as product(code text) where product.code = pricing.product_code)) then
    raise exception 'Each imported product must have exactly one pricing stub' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtext('replace_product_catalogue_transaction'));
  delete from public.products where code is not null;
  insert into public.products (code, name, logic, duration, category, destination, level, description, usp, notes_to_sales, price_from, region)
  select product.code, product.name, product.logic, product.duration, product.category, product.destination, product.level, product.description, product.usp, product.notes_to_sales, product.price_from, product.region
  from jsonb_to_recordset(p_products) as product(code text, name text, logic text, duration text, category text, destination text, level text, description text, usp text, notes_to_sales text, price_from text, region text);
  insert into public.product_pricing (product_code, std_cost, p1, p2, p3, p4, p5, p6, p7, p8, p9, p10, c1, c2, c3, c4, c5, c6, c7, c8, c9, c10, incl_guide, incl_transport, incl_tickets, incl_water, incl_meals)
  select pricing.product_code, pricing.std_cost, pricing.p1, pricing.p2, pricing.p3, pricing.p4, pricing.p5, pricing.p6, pricing.p7, pricing.p8, pricing.p9, pricing.p10, pricing.c1, pricing.c2, pricing.c3, pricing.c4, pricing.c5, pricing.c6, pricing.c7, pricing.c8, pricing.c9, pricing.c10, pricing.incl_guide, pricing.incl_transport, pricing.incl_tickets, pricing.incl_water, pricing.incl_meals
  from jsonb_to_recordset(p_pricing_stubs) as pricing(product_code text, std_cost numeric, p1 numeric, p2 numeric, p3 numeric, p4 numeric, p5 numeric, p6 numeric, p7 numeric, p8 numeric, p9 numeric, p10 numeric, c1 numeric, c2 numeric, c3 numeric, c4 numeric, c5 numeric, c6 numeric, c7 numeric, c8 numeric, c9 numeric, c10 numeric, incl_guide boolean, incl_transport boolean, incl_tickets boolean, incl_water boolean, incl_meals boolean);
end;
$function$;
revoke all on function public.replace_product_catalogue_transaction(jsonb, jsonb) from public;
grant execute on function public.replace_product_catalogue_transaction(jsonb, jsonb) to authenticated;

-- Product catalogue server-pagination RPCs. Keep in sync with CLI migrations.
create or replace function public.list_products_page(p_page_number integer, p_page_size integer, p_search_text text default null, p_filter_region text default null, p_filter_duration text default null, p_filter_category text default null, p_filter_destination text default null, p_filter_pricing_status text default null)
returns jsonb language plpgsql stable security invoker set search_path = public as $$
declare result jsonb;
begin
 if p_page_number < 1 or p_page_size not in (12,24,48,96) then raise exception 'Yêu cầu phân trang không hợp lệ' using errcode='22023'; end if;
 with base as (select p.*,case when pp.product_code is null then 'missing' when greatest(coalesce(pp.p1,0),coalesce(pp.p2,0),coalesce(pp.p3,0),coalesce(pp.p4,0),coalesce(pp.p5,0),coalesce(pp.p6,0),coalesce(pp.p7,0),coalesce(pp.p8,0),coalesce(pp.p9,0),coalesce(pp.p10,0))>0 and greatest(coalesce(pp.c1,0),coalesce(pp.c2,0),coalesce(pp.c3,0),coalesce(pp.c4,0),coalesce(pp.c5,0),coalesce(pp.c6,0),coalesce(pp.c7,0),coalesce(pp.c8,0),coalesce(pp.c9,0),coalesce(pp.c10,0))>0 then 'complete' when greatest(coalesce(pp.std_cost,0),coalesce(pp.p1,0),coalesce(pp.p2,0),coalesce(pp.p3,0),coalesce(pp.p4,0),coalesce(pp.p5,0),coalesce(pp.p6,0),coalesce(pp.p7,0),coalesce(pp.p8,0),coalesce(pp.p9,0),coalesce(pp.p10,0),coalesce(pp.c1,0),coalesce(pp.c2,0),coalesce(pp.c3,0),coalesce(pp.c4,0),coalesce(pp.c5,0),coalesce(pp.c6,0),coalesce(pp.c7,0),coalesce(pp.c8,0),coalesce(pp.c9,0),coalesce(pp.c10,0))>0 then 'incomplete' else 'missing' end pricing_status from products p left join product_pricing pp on pp.product_code=p.code), filtered as (select * from base where (nullif(trim(p_search_text),'') is null or name ilike '%'||p_search_text||'%' or description ilike '%'||p_search_text||'%' or code ilike '%'||p_search_text||'%' or destination ilike '%'||p_search_text||'%') and (nullif(trim(p_filter_region),'') is null or region=p_filter_region) and (nullif(trim(p_filter_duration),'') is null or duration=p_filter_duration) and (nullif(trim(p_filter_category),'') is null or category ilike '%'||p_filter_category||'%') and (nullif(trim(p_filter_destination),'') is null or destination=p_filter_destination) and (nullif(trim(p_filter_pricing_status),'') is null or pricing_status=p_filter_pricing_status)), meta as (select count(*)::integer total from filtered), pi as (select total,greatest(1,ceil(total::numeric/p_page_size)::integer) pages from meta), paged as (select f.* from filtered f cross join pi order by code limit p_page_size offset (select (least(p_page_number,pages)-1)*p_page_size from pi)) select jsonb_build_object('items',(select coalesce(jsonb_agg(to_jsonb(paged) order by code),'[]'::jsonb) from paged),'page',(select least(p_page_number,pages) from pi),'pageSize',p_page_size,'totalCount',(select total from pi),'totalPages',(select pages from pi),'hasPreviousPage',(select least(p_page_number,pages)>1 from pi),'hasNextPage',(select least(p_page_number,pages)<pages from pi)) into result; return result;
end; $$;
revoke all on function public.list_products_page(integer,integer,text,text,text,text,text,text) from public;
grant execute on function public.list_products_page(integer,integer,text,text,text,text,text,text) to authenticated;

create or replace function public.list_product_modules_page(p_page_number integer,p_page_size integer,p_search_text text default null) returns jsonb language sql stable security invoker set search_path=public as $$
 with f as (select p.*,case p.region when 'north' then 1 when 'central' then 2 when 'south' then 3 end rr from products p where p.region in ('north','central','south') and lower(coalesce(p.duration,'')) not like '%service%' and (nullif(trim(p_search_text),'') is null or p.name ilike '%'||p_search_text||'%' or p.code ilike '%'||p_search_text||'%' or p.description ilike '%'||p_search_text||'%')), m as (select count(*)::integer n from f), pi as (select n,greatest(1,ceil(n::numeric/p_page_size)::integer) pages from m), x as (select f.* from f cross join pi order by rr,code limit p_page_size offset (select (least(p_page_number,pages)-1)*p_page_size from pi)) select jsonb_build_object('items',(select coalesce(jsonb_agg((to_jsonb(x)-'rr') order by rr,code),'[]'::jsonb) from x),'page',(select least(p_page_number,pages) from pi),'pageSize',p_page_size,'totalCount',(select n from pi),'totalPages',(select pages from pi),'hasPreviousPage',(select least(p_page_number,pages)>1 from pi),'hasNextPage',(select least(p_page_number,pages)<pages from pi));
$$;
revoke all on function public.list_product_modules_page(integer,integer,text) from public;
grant execute on function public.list_product_modules_page(integer,integer,text) to authenticated;

create or replace function public.list_product_facets(
  p_search_text text default null, p_filter_region text default null,
  p_filter_duration text default null, p_filter_category text default null,
  p_filter_destination text default null, p_filter_pricing_status text default null
) returns jsonb language sql stable security invoker set search_path = public as $$
  with base as (
    select p.code, p.name, p.description, p.destination, p.region, p.duration, p.category,
      case
        when pp.product_code is null then 'missing'
        when greatest(coalesce(pp.p1,0),coalesce(pp.p2,0),coalesce(pp.p3,0),coalesce(pp.p4,0),coalesce(pp.p5,0),coalesce(pp.p6,0),coalesce(pp.p7,0),coalesce(pp.p8,0),coalesce(pp.p9,0),coalesce(pp.p10,0)) > 0
         and greatest(coalesce(pp.c1,0),coalesce(pp.c2,0),coalesce(pp.c3,0),coalesce(pp.c4,0),coalesce(pp.c5,0),coalesce(pp.c6,0),coalesce(pp.c7,0),coalesce(pp.c8,0),coalesce(pp.c9,0),coalesce(pp.c10,0)) > 0 then 'complete'
        when greatest(coalesce(pp.std_cost,0),coalesce(pp.p1,0),coalesce(pp.p2,0),coalesce(pp.p3,0),coalesce(pp.p4,0),coalesce(pp.p5,0),coalesce(pp.p6,0),coalesce(pp.p7,0),coalesce(pp.p8,0),coalesce(pp.p9,0),coalesce(pp.p10,0),coalesce(pp.c1,0),coalesce(pp.c2,0),coalesce(pp.c3,0),coalesce(pp.c4,0),coalesce(pp.c5,0),coalesce(pp.c6,0),coalesce(pp.c7,0),coalesce(pp.c8,0),coalesce(pp.c9,0),coalesce(pp.c10,0)) > 0 then 'incomplete'
        else 'missing' end as pricing_status
    from public.products p left join public.product_pricing pp on pp.product_code = p.code
  ), filtered as (
    select * from base where
      (nullif(trim(p_search_text),'') is null or name ilike '%'||p_search_text||'%' or description ilike '%'||p_search_text||'%' or code ilike '%'||p_search_text||'%' or destination ilike '%'||p_search_text||'%') and
      (nullif(trim(p_filter_region),'') is null or region = p_filter_region) and
      (nullif(trim(p_filter_duration),'') is null or duration = p_filter_duration) and
      (nullif(trim(p_filter_category),'') is null or category ilike '%'||p_filter_category||'%')
  ), destination_rows as (
    select coalesce(destination,'Other') destination, count(*)::integer total from filtered
    where (nullif(trim(p_filter_pricing_status),'') is null or pricing_status = p_filter_pricing_status)
    group by coalesce(destination,'Other')
  ), pricing_rows as (
    select pricing_status, count(*)::integer total from filtered
    where (nullif(trim(p_filter_destination),'') is null or destination = p_filter_destination)
    group by pricing_status
  ) select jsonb_build_object(
    'categories', (select coalesce(jsonb_agg(category order by category),'[]'::jsonb) from (select distinct category from base where category <> '') c),
    'destinations', (select coalesce(jsonb_object_agg(destination,total),'{}'::jsonb) from destination_rows),
    'pricingPulse', jsonb_build_object('complete',coalesce((select total from pricing_rows where pricing_status='complete'),0),'incomplete',coalesce((select total from pricing_rows where pricing_status='incomplete'),0),'missing',coalesce((select total from pricing_rows where pricing_status='missing'),0))
  );
$$;
revoke all on function public.list_product_facets(text,text,text,text,text,text) from public;
grant execute on function public.list_product_facets(text,text,text,text,text,text) to authenticated;

-- ============================================================
--  MODULE 13b · ATTRACTION SCHEDULE
-- ============================================================

create table if not exists attractions (
  id              text primary key,                -- ATT-N-001
  region          text not null check (region in ('north', 'central', 'south')),
  type            text not null,                   -- museum | heritage | temple | landmark | nature
  name            text not null,
  dest            text not null,
  hours           text,
  closed          text,
  admission       text,
  duration        smallint default 0,
  best_time       text,
  crowd           text,
  book_req        boolean default false,
  seasonal        text,
  notes           text,
  alert           text,
  phone           text default '',
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create table if not exists attraction_photos (
  attraction_id   text not null references attractions(id) on delete cascade,
  photo_id        text not null references photos(id) on delete cascade,
  sort_order      smallint default 0,
  is_featured     boolean not null default false,
  primary key (attraction_id, photo_id)
);

-- Aggregate Product and Attraction mutations. Keep in sync with CLI migration.
+create or replace function public.save_product_aggregate(
  p_product jsonb,
  p_pricing_stub jsonb,
  p_photo_links jsonb
)
returns void
language plpgsql
security invoker
set search_path = public
as $function$
declare
  v_code text := p_product ->> 'code';
begin
  if jsonb_typeof(p_product) <> 'object'
     or coalesce(nullif(trim(v_code), ''), '') = ''
     or coalesce(nullif(trim(p_product ->> 'name'), ''), '') = '' then
    raise exception 'Product payload requires a code and name' using errcode = '22023';
  end if;
  if jsonb_typeof(p_pricing_stub) <> 'object'
     or p_pricing_stub ->> 'product_code' <> v_code then
    raise exception 'Product pricing stub must belong to the product' using errcode = '22023';
  end if;
  if jsonb_typeof(p_photo_links) <> 'array' then
    raise exception 'Product photo links must be an array' using errcode = '22023';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_photo_links) as photo
    where coalesce(nullif(trim(photo ->> 'photo_id'), ''), '') = ''
       or photo ->> 'product_code' <> v_code
  ) or exists (
    select 1 from jsonb_array_elements(p_photo_links) as photo
    group by photo ->> 'photo_id' having count(*) > 1
  ) then
    raise exception 'Product photo links must be unique and belong to the product' using errcode = '22023';
  end if;

  insert into public.products (
    code, name, logic, duration, category, destination, level, description,
    usp, notes_to_sales, price_from, region
  ) values (
    v_code, p_product ->> 'name', nullif(p_product ->> 'logic', ''),
    nullif(p_product ->> 'duration', ''), nullif(p_product ->> 'category', ''),
    nullif(p_product ->> 'destination', ''), nullif(p_product ->> 'level', ''),
    nullif(p_product ->> 'description', ''), nullif(p_product ->> 'usp', ''),
    nullif(p_product ->> 'notes_to_sales', ''), nullif(p_product ->> 'price_from', ''),
    nullif(p_product ->> 'region', '')
  ) on conflict (code) do update set
    name = excluded.name, logic = excluded.logic, duration = excluded.duration,
    category = excluded.category, destination = excluded.destination,
    level = excluded.level, description = excluded.description, usp = excluded.usp,
    notes_to_sales = excluded.notes_to_sales, price_from = excluded.price_from,
    region = excluded.region, updated_at = now();

  insert into public.product_pricing (
    product_code, std_cost, p1, p2, p3, p4, p5, p6, p7, p8, p9, p10,
    c1, c2, c3, c4, c5, c6, c7, c8, c9, c10,
    incl_guide, incl_transport, incl_tickets, incl_water, incl_meals
  ) values (
    v_code,
    coalesce((p_pricing_stub ->> 'std_cost')::numeric, 0),
    coalesce((p_pricing_stub ->> 'p1')::numeric, 0), coalesce((p_pricing_stub ->> 'p2')::numeric, 0),
    coalesce((p_pricing_stub ->> 'p3')::numeric, 0), coalesce((p_pricing_stub ->> 'p4')::numeric, 0),
    coalesce((p_pricing_stub ->> 'p5')::numeric, 0), coalesce((p_pricing_stub ->> 'p6')::numeric, 0),
    coalesce((p_pricing_stub ->> 'p7')::numeric, 0), coalesce((p_pricing_stub ->> 'p8')::numeric, 0),
    coalesce((p_pricing_stub ->> 'p9')::numeric, 0), coalesce((p_pricing_stub ->> 'p10')::numeric, 0),
    coalesce((p_pricing_stub ->> 'c1')::numeric, 0), coalesce((p_pricing_stub ->> 'c2')::numeric, 0),
    coalesce((p_pricing_stub ->> 'c3')::numeric, 0), coalesce((p_pricing_stub ->> 'c4')::numeric, 0),
    coalesce((p_pricing_stub ->> 'c5')::numeric, 0), coalesce((p_pricing_stub ->> 'c6')::numeric, 0),
    coalesce((p_pricing_stub ->> 'c7')::numeric, 0), coalesce((p_pricing_stub ->> 'c8')::numeric, 0),
    coalesce((p_pricing_stub ->> 'c9')::numeric, 0), coalesce((p_pricing_stub ->> 'c10')::numeric, 0),
    coalesce((p_pricing_stub ->> 'incl_guide')::boolean, false),
    coalesce((p_pricing_stub ->> 'incl_transport')::boolean, false),
    coalesce((p_pricing_stub ->> 'incl_tickets')::boolean, false),
    coalesce((p_pricing_stub ->> 'incl_water')::boolean, false),
    coalesce((p_pricing_stub ->> 'incl_meals')::boolean, false)
  ) on conflict (product_code) do nothing;

  delete from public.product_photos where product_code = v_code;
  insert into public.product_photos (product_code, photo_id, sort_order, is_featured)
  select
    v_code, photo ->> 'photo_id', coalesce((photo ->> 'sort_order')::smallint, 0),
    coalesce((photo ->> 'is_featured')::boolean, false)
  from jsonb_array_elements(p_photo_links) as photo;
end;
$function$;

create or replace function public.save_attraction_aggregate(
  p_attraction jsonb,
  p_photo_links jsonb
)
returns void
language plpgsql
security invoker
set search_path = public
as $function$
declare
  v_id text := p_attraction ->> 'id';
begin
  if jsonb_typeof(p_attraction) <> 'object'
     or coalesce(nullif(trim(v_id), ''), '') = ''
     or coalesce(nullif(trim(p_attraction ->> 'name'), ''), '') = ''
     or coalesce(nullif(trim(p_attraction ->> 'region'), ''), '') not in ('north', 'central', 'south')
     or coalesce(nullif(trim(p_attraction ->> 'type'), ''), '') = ''
     or coalesce(nullif(trim(p_attraction ->> 'dest'), ''), '') = '' then
    raise exception 'Attraction payload is invalid' using errcode = '22023';
  end if;
  if jsonb_typeof(p_photo_links) <> 'array' then
    raise exception 'Attraction photo links must be an array' using errcode = '22023';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_photo_links) as photo
    where coalesce(nullif(trim(photo ->> 'photo_id'), ''), '') = ''
       or photo ->> 'attraction_id' <> v_id
  ) or exists (
    select 1 from jsonb_array_elements(p_photo_links) as photo
    group by photo ->> 'photo_id' having count(*) > 1
  ) then
    raise exception 'Attraction photo links must be unique and belong to the attraction' using errcode = '22023';
  end if;

  insert into public.attractions (
    id, region, type, name, dest, hours, closed, admission, duration,
    best_time, crowd, book_req, seasonal, notes, alert, phone
  ) values (
    v_id, p_attraction ->> 'region', p_attraction ->> 'type', p_attraction ->> 'name',
    p_attraction ->> 'dest', nullif(p_attraction ->> 'hours', ''),
    nullif(p_attraction ->> 'closed', ''), nullif(p_attraction ->> 'admission', ''),
    coalesce((p_attraction ->> 'duration')::smallint, 0),
    nullif(p_attraction ->> 'best_time', ''), nullif(p_attraction ->> 'crowd', ''),
    coalesce((p_attraction ->> 'book_req')::boolean, false),
    nullif(p_attraction ->> 'seasonal', ''), nullif(p_attraction ->> 'notes', ''),
    nullif(p_attraction ->> 'alert', ''), coalesce(p_attraction ->> 'phone', '')
  ) on conflict (id) do update set
    region = excluded.region, type = excluded.type, name = excluded.name,
    dest = excluded.dest, hours = excluded.hours, closed = excluded.closed,
    admission = excluded.admission, duration = excluded.duration,
    best_time = excluded.best_time, crowd = excluded.crowd,
    book_req = excluded.book_req, seasonal = excluded.seasonal, notes = excluded.notes,
    alert = excluded.alert, phone = excluded.phone, updated_at = now();

  delete from public.attraction_photos where attraction_id = v_id;
  insert into public.attraction_photos (attraction_id, photo_id, sort_order, is_featured)
  select
    v_id, photo ->> 'photo_id', coalesce((photo ->> 'sort_order')::smallint, 0),
    coalesce((photo ->> 'is_featured')::boolean, false)
  from jsonb_array_elements(p_photo_links) as photo;
end;
$function$;

revoke all on function public.save_product_aggregate(jsonb, jsonb, jsonb) from public;
grant execute on function public.save_product_aggregate(jsonb, jsonb, jsonb) to authenticated;
revoke all on function public.save_attraction_aggregate(jsonb, jsonb) from public;
grant execute on function public.save_attraction_aggregate(jsonb, jsonb) to authenticated;

insert into attractions (
  id, region, type, name, dest, hours, closed, admission, duration,
  best_time, crowd, book_req, seasonal, notes, alert, phone
) values
('ATT-N-001','north','museum','Vietnam Museum of Ethnology','Hanoi','Tue–Sun 08:30–17:30','Monday','40,000 VND / ~$2','90','Morning (09:00–11:00)','Moderate; quietest weekday mornings',false,'No seasonal closures','One of Vietnam''s finest museums. Outdoor exhibits close in heavy rain. Allow extra time for outdoor folk houses.','CLOSED MONDAYS','+84 24 3756 2193'),
  ('ATT-N-002','north','landmark','Ho Chi Minh Mausoleum','Hanoi','Tue–Thu, Sat–Sun 07:30–10:30 (summer) / 08:00–11:00 (winter)','Monday & Friday ALWAYS + Sep–Nov maintenance','Free','60','Early (07:30 open)','Very busy on weekends; go at opening',false,'CLOSED Sep–Nov for annual maintenance','Smart dress required. No shorts, sleeveless, hats. Bags stored at entrance. Solemn silence maintained.','CLOSED Mon & Fri + CLOSED Sep–Nov',''),
  ('ATT-N-003','north','museum','Vietnam National Museum of History','Hanoi','Tue–Sun 08:00–17:00','Monday','40,000 VND','75','Morning','Light to moderate',false,'No seasonal closures','Two buildings (ancient & modern). Good A/C. Allow 75 mins for both buildings.','CLOSED MONDAYS','+84 24 3824 5344'),
  ('ATT-N-004','north','museum','Vietnam Museum of Fine Arts','Hanoi','Tue–Sun 08:30–17:00','Monday','40,000 VND','60','Morning (avoid lunch hour)','Usually quiet',false,'No seasonal closures','3 floors. Folk art, lacquerware, sculpture. Often overlooked by tourists — excellent for art lovers.','CLOSED MONDAYS',''),
  ('ATT-N-005','north','museum','Women''s Museum of Vietnam','Hanoi','Tue–Sun 08:00–17:00','Monday','30,000 VND','45','Any time','Usually quiet',false,'No seasonal closures','Fascinating exhibits on women''s roles in Vietnamese history and war. Hidden gem in Old Quarter.','CLOSED MONDAYS',''),
  ('ATT-N-006','north','museum','Vietnam Military History Museum','Hanoi','Tue–Sun 08:00–17:00 (closed 11:30–13:00)','Monday','40,000 VND','60','Morning','Moderate; busier on weekends',false,'Outdoor exhibits affected in heavy rain','Features B-52 wreckage, military hardware. Closed for lunch 11:30–13:00 daily.','CLOSED MONDAYS + LUNCH 11:30–13:00',''),
  ('ATT-N-007','north','museum','Hoa Lo Prison Museum (Hanoi Hilton)','Hanoi','Daily 08:00–17:00','No regular closure','30,000 VND','45','Morning (before tour groups arrive)','Busy 09:30–12:00',false,'No seasonal closures','Open daily — good backup if Mausoleum is closed. Emotional and powerful. Guides highly recommended.','OPEN DAILY','+84 24 3934 2253'),
  ('ATT-N-008','north','museum','Museum of the Vietnamese Revolution','Hanoi','Tue–Sun 08:00–12:00, 14:00–17:00','Monday + lunch break','20,000 VND','45','Morning or afternoon','Very light',false,'No seasonal closures','Chronological exhibits from 1930–1975 revolution. Often combined with History Museum nearby.','CLOSED MONDAYS',''),
  ('ATT-N-009','north','heritage','Hoan Kiem Lake & Ngoc Son Temple','Hanoi','Temple 08:00–18:00 daily','None','30,000 VND (temple)','45','Early morning (06:30–08:00) or evening','Busy at all times; quietest pre-8am',false,'No seasonal closures','Lake always accessible. Temple on island requires entrance fee. Morning exercise culture best observed 06:00–07:30.','OPEN DAILY',''),
  ('ATT-N-010','north','museum','Vietnam Museum of Nature','Hanoi','Tue–Sun 08:30–17:00','Monday','30,000 VND','45','Morning','Usually very quiet',false,'No closures','Small museum covering geology, flora, fauna of Vietnam. Less visited — very pleasant for nature lovers.','CLOSED MONDAYS',''),
  ('ATT-N-011','north','heritage','Ha Long Bay UNESCO Site','Halong Bay','Cruise departures 08:00–12:00','None but may suspend in typhoon season (Jul–Oct)','Per cruise package','1440','Nov–Apr (dry season, clear skies)','Busy year-round; less Nov–Jan',true,'Strong winds Oct; typhoon risk Jul–Sep. Some caves close Nov–Mar.','Book cruise 4+ weeks in advance in high season. Kayaking at Luon Cave best at low tide.','BOOK IN ADVANCE · CHECK WEATHER SEP–OCT',''),
  ('ATT-N-012','north','museum','Quang Ninh Museum','Halong Bay','Tue–Sun 08:00–17:00','Monday','Free','45','Morning','Very light',false,'No closures','Modern museum covering geology and history of Quang Ninh province. Excellent architecture.','CLOSED MONDAYS',''),
  ('ATT-N-013','north','heritage','Trang An Scenic Landscape Complex','Ninh Binh','Daily 07:00–17:00','None','200,000 VND','180','Morning (07:00–10:00 before tour buses)','Busy 09:00–14:00; very crowded weekends',false,'Can flood Sep–Oct; beautiful but misty in winter','3-hour boat circuit. No motorised boats. Allow 3 hours. Avoid peak hours. Bring sun protection.','ARRIVE EARLY — BUSY BY 09:30',''),
  ('ATT-N-014','north','museum','Hoa Lu Ancient Capital','Ninh Binh','Daily 07:00–17:30','None','20,000 VND','60','Morning','Light to moderate',false,'No closures','First capital of Vietnam. Two well-preserved temples (Dinh and Le dynasties). Often paired with Trang An.','OPEN DAILY',''),
  ('ATT-N-015','north','museum','Sapa Museum','Sapa','Daily 07:30–11:30, 13:30–17:30','None officially but irregular hours','Free','30','Morning','Light',false,'Fog common Nov–Mar; very cold Dec–Feb','Small but informative on ethnic minority cultures. Worth 30 mins before trekking. Irregular hours — call ahead.','VERIFY HOURS BEFORE VISITING',''),
  ('ATT-C-001','central','museum','Museum of Royal Fine Arts (Hue)','Hue','Daily 07:00–17:30','None','40,000 VND','60','Morning','Moderate',false,'No seasonal closures','Located inside the Hue Citadel complex. Features imperial furniture, porcelain, royal objects. Combine with Citadel visit.','OPEN DAILY',''),
  ('ATT-C-002','central','heritage','Hue Imperial Citadel (Forbidden Purple City)','Hue','Daily 07:00–17:30 (summer) / 07:00–17:00 (winter)','None','200,000 VND','180','Early morning (07:00–09:00)','Very busy 09:00–13:00; calmer after 14:30',false,'Flooding risk Sep–Nov; check conditions','UNESCO. Allow 3 hours for full citadel. Hire electric cart for elderly/mobility limited guests. Audio guide available.','OPEN DAILY · FLOOD RISK SEP–NOV','+84 234 3501 143'),
  ('ATT-C-003','central','museum','Hue Museum of History','Hue','Tue–Sun 07:00–17:30','Monday','20,000 VND','45','Morning','Very light',false,'No seasonal closures','Good context for the Citadel visit. Covers Nguyen Dynasty artefacts. Often skipped by tourists — worthwhile.','CLOSED MONDAYS',''),
  ('ATT-C-004','central','museum','Hue Museum of Traditional Huế Medicine','Hue','Mon–Sat 07:30–11:30, 13:30–17:00','Sunday','Free','30','Morning','Very quiet',false,'No closures','Niche but fascinating for wellness-oriented guests. Traditional herbal remedies and royal medicine.','CLOSED SUNDAYS',''),
  ('ATT-C-005','central','heritage','My Son Sanctuary (Cham Ruins)','Hoi An & Da Nang','Daily 06:30–17:00 (no entry after 16:30)','None but check monsoon season','150,000 VND','120','07:00–09:00 (beat crowds + heat)','Very busy 09:00–13:00; quieter after 14:30',false,'Avoid midday Jun–Aug (extreme heat). Some paths close Oct–Nov (flooding)','UNESCO. No entry after 16:30. Early morning essential in summer. Electric buggy available. Bring water.','NO ENTRY AFTER 16:30 · ARRIVE EARLY IN SUMMER',''),
  ('ATT-C-006','central','museum','Museum of Cham Sculpture (Da Nang)','Hoi An & Da Nang','Daily 07:00–17:00','None','60,000 VND','60','Morning or afternoon','Light to moderate',false,'No seasonal closures','Outstanding collection of Cham artefacts — best in the world. Essential companion to My Son visit. Well-curated, good A/C.','OPEN DAILY',''),
  ('ATT-C-007','central','museum','Hoi An Museum of History and Culture','Hoi An & Da Nang','Daily 08:00–17:00','None','Covered by Ancient Town ticket','30','Morning','Moderate in town centre',false,'Flooding Oct–Nov — some streets impassable','Inside the Ancient Town. Part of the combined ticket (5 sites). Small but informative. Combine with Assembly Halls.','OPEN DAILY · FLOOD RISK OCT–NOV',''),
  ('ATT-C-008','central','museum','Museum of Trade Ceramics (Hoi An)','Hoi An & Da Nang','Daily 08:00–17:00','None','Covered by Ancient Town ticket','30','Morning or afternoon','Light',false,'No closures','Covers 200 years of Hoi An''s role in Asian ceramics trade. Small, well-presented. Good A/C.','OPEN DAILY',''),
  ('ATT-C-009','central','museum','Museum of Sa Huỳnh Culture (Hoi An)','Hoi An & Da Nang','Daily 08:00–17:00','None','Covered by Ancient Town ticket','30','Morning','Very light',false,'No closures','Pre-Cham culture artefacts. Very niche — good for archaeology-minded guests.','OPEN DAILY',''),
  ('ATT-C-010','central','heritage','Phong Nha Cave (Son Doong Region)','Phong Nha','Daily 07:30–16:00 (last entry 15:30)','None officially; check Oct–Nov floods','150,000 VND (Phong Nha) / varies','120','Morning, before tourist boats fill up','Busy Feb–Aug; peaks Apr–May & Jul–Aug',true,'CLOSED Oct–Nov some years due to flooding. Book 3+ weeks ahead in peak.','UNESCO. Boat tour inside cave. Combine with Paradise Cave (additional ticket). Book boatman in advance.','BOOK IN ADVANCE · CHECK OCT–NOV CLOSURES',''),
  ('ATT-C-011','central','museum','Quang Binh Museum (Phong Nha)','Phong Nha','Mon–Fri 07:30–11:30, 13:30–17:00','Weekend','Free','30','Weekday morning','Very quiet',false,'No closures','Covers wartime history of Quang Binh province. Small but contextually useful. Weekend closure is strict.','CLOSED WEEKENDS',''),
  ('ATT-S-001','south','museum','War Remnants Museum (Ho Chi Minh City)','Ho Chi Minh City','Daily 07:30–18:00','None','40,000 VND','90','Morning (before emotional fatigue sets in)','Very busy 08:30–12:00; calmer after 14:00',false,'No seasonal closures','Emotionally intense. Allow 1.5 hours. Discuss with clients beforehand — not suitable for all guests. Photography allowed.','OPEN DAILY · EMOTIONALLY INTENSE — PREPARE CLIENTS','+84 28 3930 5587'),
  ('ATT-S-002','south','museum','Ho Chi Minh City Museum','Ho Chi Minh City','Daily 07:30–18:00','None','30,000 VND','60','Morning','Moderate',false,'No closures','Former Gia Long Palace. Covers colonial and revolutionary history. Hidden tunnels in basement. Well-maintained.','OPEN DAILY',''),
  ('ATT-S-003','south','museum','Museum of Vietnamese History (Saigon)','Ho Chi Minh City','Mon–Sat 08:00–17:00 (closed Tue lunch 11:00–13:30)','Tuesday lunch break','30,000 VND','60','Morning','Light to moderate',false,'No closures','Adjacent to Botanical Garden. Good chronological overview from prehistoric to 1975. Water puppetry shows on site.','TUE LUNCH CLOSED 11:00–13:30',''),
  ('ATT-S-004','south','museum','Independence Palace (Reunification Palace)','Ho Chi Minh City','Daily 07:30–11:00, 13:00–16:00','Public holidays may affect','40,000 VND','75','Morning session','Busy on weekends; moderate weekdays',false,'No closures','Former presidential palace. The original 1975 tank crash site is preserved. War room in basement fascinating.','OPEN DAILY · LUNCH BREAK 11:00–13:00','+84 28 3822 3652'),
  ('ATT-S-005','south','museum','Fine Arts Museum (Ho Chi Minh City)','Ho Chi Minh City','Tue–Sun 09:00–17:00','Monday','30,000 VND','60','Morning','Very light — a hidden gem',false,'No closures','Beautiful colonial building. Three floors of Vietnamese art from traditional to contemporary. Peaceful and underrated.','CLOSED MONDAYS',''),
  ('ATT-S-006','south','heritage','Cu Chi Tunnels (Ben Duoc or Ben Dinh)','Ho Chi Minh City','Daily 07:30–17:00','None','110,000 VND','120','Morning (cooler, less crowded)','Very busy weekends; moderate weekdays',false,'Hot and humid May–Sep; bring water','Ben Duoc (farther) is more authentic and less crowded than Ben Dinh. Wear comfortable clothes. Claustrophobic tunnels — warn guests.','OPEN DAILY · ARRIVE BEFORE 09:30 ON WEEKENDS',''),
  ('ATT-S-007','south','museum','Mekong Delta Eco Museum (Can Tho)','Can Tho','Daily 07:30–17:00','None','20,000 VND','45','Morning before floating market visits','Very light',false,'Flooding possible Sep–Nov','Covers Mekong river ecology and delta communities. Small but informative. Good orientation before river tours.','OPEN DAILY',''),
  ('ATT-S-008','south','museum','Can Tho Museum','Can Tho','Tue–Sun 08:00–11:30, 13:30–17:00','Monday','Free','40','Morning','Very quiet',false,'No closures','History of the Mekong Delta and Can Tho province. Combine with floating market visit (Cai Rang) for context.','CLOSED MONDAYS',''),
  ('ATT-S-009','south','museum','Da Lat Museum (Lam Dong Province Museum)','Da Lat','Mon–Fri 07:30–11:30, 13:30–17:00','Weekends','Free','30','Weekday morning','Very quiet',false,'No closures; cool year-round (1,500m altitude)','Covers highland ecology and ethnic minority culture. Useful background before trekking/village visits.','CLOSED WEEKENDS',''),
  ('ATT-S-010','south','museum','Khanh Hoa Museum (Nha Trang)','Nha Trang','Tue–Sun 08:00–11:30, 14:00–17:00','Monday','Free','30','Morning','Very light',false,'No seasonal closures','Overview of Cham culture and Khanh Hoa province history. Pair with Po Nagar Cham Towers visit nearby.','CLOSED MONDAYS',''),
  ('ATT-S-011','south','heritage','Po Nagar Cham Towers (Nha Trang)','Nha Trang','Daily 06:00–17:30','None','22,000 VND','45','Early morning (06:00–08:00) for best light and quiet','Busy 09:00–12:00',false,'Hot Apr–Aug; some festive ceremonies in spring','Active religious site — dress modestly, sarongs provided at entrance. Photography respectfully.','OPEN DAILY · DRESS CODE REQUIRED',''),
  ('ATT-S-012','south','museum','Con Dao Prison & Museum','Con Dao','Daily 07:30–11:30, 13:30–17:00','None','Free','60','Morning','Very light (Con Dao is remote)',false,'Accessible year-round by plane; sea rough Jun–Sep','Harrowing colonial-era prison complex. Very moving. Revolutionary cemetery also worth visiting. Context essential.','OPEN DAILY · EMOTIONALLY INTENSE','')
on conflict (id) do update set
  region = excluded.region,
  type = excluded.type,
  name = excluded.name,
  dest = excluded.dest,
  hours = excluded.hours,
  closed = excluded.closed,
  admission = excluded.admission,
  duration = excluded.duration,
  best_time = excluded.best_time,
  crowd = excluded.crowd,
  book_req = excluded.book_req,
  seasonal = excluded.seasonal,
  notes = excluded.notes,
  alert = excluded.alert,
  phone = excluded.phone,
  updated_at = now();

-- ============================================================
--  MODULE 14 · GUIDE CALENDAR
-- ============================================================

create table if not exists cal_events (
  id              text primary key,                -- CE-001
  guide_id        text references guides(id) on delete cascade,
  booking_id      text references bookings(id) on delete set null,  -- app: bookingCode
  tour            text,
  clients         text,
  start_date      date not null,                   -- app: start
  end_date        date not null,                   -- app: end
  status          text default 'booked',
  notes           text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- ============================================================
--  MODULE 15 · TEAM CHAT
-- ============================================================

create table if not exists chat_channels (
  id              text primary key,
  display_name    text not null,
  created_at      timestamptz default now()
);

create table if not exists chat_messages (
  id              text primary key,                -- m1
  channel_id      text not null references chat_channels(id) on delete cascade,
  author          text not null,
  body            text not null,                   -- app: text
  sent_at         timestamptz default now()        -- app: time
);

create table if not exists chat_reactions (
  message_id      text not null references chat_messages(id) on delete cascade,
  emoji           text not null,
  added_by        text not null default '',
  primary key (message_id, emoji, added_by)
);

insert into chat_channels (id, display_name) values
  ('general',    'General'),
  ('sales',      'Sales'),
  ('operations', 'Operations'),
  ('finance',    'Finance'),
  ('guides',     'Guides'),
  ('devnotes',   'Dev Notes'),
  ('tai',        'Tai Pham'),
  ('linh',       'Linh N.'),
  ('minh',       'Minh T.'),
  ('huong',      'Huong L.')
on conflict (id) do nothing;

-- ============================================================
--  MODULE 16 · DEV NOTES
-- ============================================================

create table if not exists dev_notes (
  id              text primary key,                -- DN-001
  title           text not null,
  priority        text default 'medium',
  category        text,
  assignee        text,
  status          text default 'open',
  note_date       date,                            -- app: date
  author          text,
  body            text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- ============================================================
--  INDEXES
-- ============================================================

create index if not exists idx_customers_email on customers(email);
create index if not exists idx_customers_client_type on customers(client_type);
create index if not exists idx_customers_agent_id on customers(agent_id);

create index if not exists idx_leads_cust_id on leads(cust_id);
create index if not exists idx_leads_stage on leads(stage);
create index if not exists idx_leads_owner on leads(owner);
create index if not exists idx_leads_needs_tour_design on leads(needs_tour_design) where needs_tour_design = true;

create index if not exists idx_tour_drafts_lead_id on tour_drafts(lead_id);
create index if not exists idx_tour_drafts_cust_id on tour_drafts(cust_id);
create index if not exists idx_tour_outline_days_draft on tour_outline_days(draft_id);

create index if not exists idx_bookings_cust_id on bookings(cust_id);
create index if not exists idx_bookings_status on bookings(status);
create index if not exists idx_bookings_guide_id on bookings(guide_id);
create index if not exists idx_bookings_start_date on bookings(start_date);

create index if not exists idx_comms_cust_id on comms(cust_id);
create index if not exists idx_comms_date on comms(comm_date);

create index if not exists idx_finance_booking_id on finance(booking_id);
create index if not exists idx_finance_type on finance(type);
create index if not exists idx_finance_month on finance(month);

create index if not exists idx_ar_status on accounts_receivable(status);
create index if not exists idx_ap_status on accounts_payable(status);
create index if not exists idx_ap_due_date on accounts_payable(due_date);

create index if not exists idx_tasks_assignee on tasks(assignee);
create index if not exists idx_tasks_status on tasks(status);
create index if not exists idx_tasks_due_date on tasks(due_date);

create index if not exists idx_feedback_booking on feedback(booking_id);
create index if not exists idx_cal_events_guide on cal_events(guide_id);
create index if not exists idx_cal_events_dates on cal_events(start_date, end_date);

create index if not exists idx_chat_messages_channel on chat_messages(channel_id);
create index if not exists idx_chat_messages_sent on chat_messages(sent_at);

create index if not exists idx_suppliers_category on suppliers(category);
create index if not exists idx_suppliers_region on suppliers(region);
create index if not exists idx_suppliers_status on suppliers(status);

create index if not exists idx_products_region on products(region);
create index if not exists idx_products_category on products(category);

create index if not exists idx_attractions_region on attractions(region);
create index if not exists idx_attractions_type on attractions(type);
create index if not exists idx_attractions_dest on attractions(dest);
create index if not exists idx_attraction_photos_photo on attraction_photos(photo_id);
create index if not exists idx_product_photos_photo on product_photos(photo_id);

-- ============================================================
--  MODULE · WEATHER (live weekly forecast cache)
-- ============================================================

create table if not exists weather_destinations (
  id              text primary key,
  name            text        not null,
  region          text        not null check (region in ('north', 'central', 'south')),
  emoji           text,
  latitude        numeric(9,6) not null,
  longitude       numeric(9,6) not null,
  elevation_m     int,
  sort_order      int         default 0,
  active          boolean     default true,
  description     text,
  notes           text,
  cover_photo_id  text        references photos(id) on delete set null,
  is_featured     boolean     not null default false,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create index if not exists idx_weather_dest_featured
  on weather_destinations (is_featured)
  where active = true;

create index if not exists idx_weather_dest_cover
  on weather_destinations (cover_photo_id)
  where cover_photo_id is not null;

create table if not exists weather_forecast_cache (
  id              bigserial primary key,
  destination_id  text        not null references weather_destinations(id) on delete cascade,
  forecast_date   date        not null,
  temp_min_c      numeric(5,1) not null,
  temp_max_c      numeric(5,1) not null,
  precip_mm       numeric(6,1) default 0,
  wind_kmh        numeric(6,1),
  weather_code    int         not null,
  travel_rating   text        not null check (travel_rating in ('E', 'G', 'F', 'P')),
  fetched_at      timestamptz not null,
  expires_at      timestamptz not null,
  unique (destination_id, forecast_date)
);

create table if not exists weather_fetch_log (
  id                  bigserial primary key,
  fetched_at          timestamptz default now(),
  status              text        not null check (status in ('ok', 'error', 'skipped')),
  destinations_count  int         default 0,
  duration_ms         int,
  error_message       text
);

create table if not exists weather_current_cache (
  destination_id text primary key references weather_destinations(id) on delete cascade,
  payload        jsonb        not null,
  fetched_at     timestamptz  not null,
  expires_at     timestamptz  not null
);

create index if not exists idx_weather_cache_dest on weather_forecast_cache(destination_id);
create index if not exists idx_weather_cache_date on weather_forecast_cache(forecast_date);
create index if not exists idx_weather_cache_expires on weather_forecast_cache(expires_at);
create index if not exists idx_weather_fetch_log_at on weather_fetch_log(fetched_at desc);
create index if not exists idx_weather_current_expires on weather_current_cache(expires_at);

-- ============================================================
--  MODULE 21 · PRICING CATALOGS (Essentials + Accommodation)
-- ============================================================
--  Imported from the two source Excel workbooks; replace-all per workbook.
--  Existing projects: run supabase/migrate-pricing-catalogs.sql instead.

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

create table if not exists pricing_ess_notes (
  id              text primary key,
  sheet           text not null default '',
  section         text default '',
  label           text default '',
  detail          text default '',
  sort_order      smallint default 0,
  updated_at      timestamptz default now()
);

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

-- ============================================================
--  ROW LEVEL SECURITY (development — tighten before production)
-- ============================================================

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
    'photo_folders','photos','photo_tags','product_photos','attractions','attraction_photos','cal_events',
    'company_branding','proposal_templates',
    'chat_channels','chat_messages','chat_reactions','dev_notes',
    'weather_destinations','weather_forecast_cache','weather_fetch_log',
    'pricing_settings','pricing_ess_products','pricing_ess_cost_lines','pricing_ess_services',
    'pricing_ess_car_rates','pricing_ess_hotel_rates','pricing_ess_notes',
    'pricing_acc_properties','pricing_acc_room_rates','pricing_acc_cruise_rates',
    'pricing_catalog_imports'
  ] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists dev_allow_all on %I', t);
    execute format(
      'create policy dev_allow_all on %I for all using (true) with check (true)', t
    );
  end loop;
end $$;

-- ============================================================
--  updated_at trigger (explicit — safe for Supabase SQL Editor)
-- ============================================================

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_updated_at on agents;
create trigger trg_updated_at before update on agents
  for each row execute procedure set_updated_at();

drop trigger if exists trg_updated_at on customers;
create trigger trg_updated_at before update on customers
  for each row execute procedure set_updated_at();

drop trigger if exists trg_updated_at on products;
create trigger trg_updated_at before update on products
  for each row execute procedure set_updated_at();

drop trigger if exists trg_updated_at on guides;
create trigger trg_updated_at before update on guides
  for each row execute procedure set_updated_at();

drop trigger if exists trg_updated_at on leads;
create trigger trg_updated_at before update on leads
  for each row execute procedure set_updated_at();

drop trigger if exists trg_updated_at on tour_drafts;
create trigger trg_updated_at before update on tour_drafts
  for each row execute procedure set_updated_at();

drop trigger if exists trg_updated_at on bookings;
create trigger trg_updated_at before update on bookings
  for each row execute procedure set_updated_at();

drop trigger if exists trg_updated_at on finance;
create trigger trg_updated_at before update on finance
  for each row execute procedure set_updated_at();

drop trigger if exists trg_updated_at on accounts_receivable;
create trigger trg_updated_at before update on accounts_receivable
  for each row execute procedure set_updated_at();

drop trigger if exists trg_updated_at on accounts_payable;
create trigger trg_updated_at before update on accounts_payable
  for each row execute procedure set_updated_at();

drop trigger if exists trg_updated_at on tax_reports;
create trigger trg_updated_at before update on tax_reports
  for each row execute procedure set_updated_at();

drop trigger if exists trg_updated_at on staff;
create trigger trg_updated_at before update on staff
  for each row execute procedure set_updated_at();

drop trigger if exists trg_updated_at on tasks;
create trigger trg_updated_at before update on tasks
  for each row execute procedure set_updated_at();

drop trigger if exists trg_updated_at on contracts;
create trigger trg_updated_at before update on contracts
  for each row execute procedure set_updated_at();

drop trigger if exists trg_updated_at on suppliers;
create trigger trg_updated_at before update on suppliers
  for each row execute procedure set_updated_at();

drop trigger if exists trg_updated_at on cal_events;
create trigger trg_updated_at before update on cal_events
  for each row execute procedure set_updated_at();

drop trigger if exists trg_updated_at on attractions;
create trigger trg_updated_at before update on attractions
  for each row execute procedure set_updated_at();

drop trigger if exists trg_updated_at on dev_notes;
create trigger trg_updated_at before update on dev_notes
  for each row execute procedure set_updated_at();

drop trigger if exists trg_updated_at on weather_destinations;
create trigger trg_updated_at before update on weather_destinations
  for each row execute procedure set_updated_at();

drop trigger if exists trg_updated_at on proposal_templates;
create trigger trg_updated_at before update on proposal_templates
  for each row execute procedure set_updated_at();

-- ============================================================
--  MODULE 14 · PHOTO STORAGE (Supabase Storage bucket)
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'photos',
  'photos',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

drop policy if exists photos_public_read on storage.objects;
create policy photos_public_read on storage.objects
  for select to public
  using (bucket_id = 'photos');

drop policy if exists photos_auth_insert on storage.objects;
create policy photos_auth_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'photos' and (
      (storage.foldername(name))[1] = 'guides'
      or (
        (storage.foldername(name))[1] = 'gallery'
      )
    )
  );

drop policy if exists photos_auth_update on storage.objects;
create policy photos_auth_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'photos' and (
      (storage.foldername(name))[1] = 'guides'
      or (
        (storage.foldername(name))[1] = 'gallery'
      )
    )
  )
  with check (
    bucket_id = 'photos' and (
      (storage.foldername(name))[1] = 'guides'
      or (
        (storage.foldername(name))[1] = 'gallery'
      )
    )
  );

drop policy if exists photos_auth_delete on storage.objects;
create policy photos_auth_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'photos' and (
      (storage.foldername(name))[1] = 'guides'
      or (
        (storage.foldername(name))[1] = 'gallery'
      )
    )
  );

-- ============================================================
--  RLS SCOPE FOUNDATION (run after the RBAC migration chain)
--
--  The standalone schema intentionally skips this block when profiles/roles
--  have not been created yet. `db:push` applies the canonical migration.
-- ============================================================

do $rls_scope$
begin
  if to_regclass('public.roles') is null then
    raise notice 'Skipping RLS scope foundation until RBAC migrations are applied.';
    return;
  end if;

  execute $ddl$
    create schema if not exists private;
    revoke all on schema private from public;
    grant usage on schema private to authenticated;

    create table if not exists public.role_resource_scopes (
      role_code text not null references public.roles(code) on delete cascade,
      resource_code text not null check (resource_code in (
        'customers', 'leads', 'tour_drafts', 'bookings', 'tasks', 'comms'
      )),
      action text not null check (action in ('read', 'write', 'delete')),
      scope text not null check (scope in ('own', 'assigned', 'all')),
      created_at timestamptz not null default now(),
      primary key (role_code, resource_code, action)
    );

    revoke all on table public.role_resource_scopes from anon, authenticated;

    comment on table public.role_resource_scopes is
      'Phạm vi truy cập dữ liệu theo role. Chỉ Access Control RPC được phép quản lý.';

    alter table public.role_resource_scopes enable row level security;

    create or replace function private.has_resource_scope(
      requested_resource text,
      requested_action text,
      accepted_scopes text[]
    )
    returns boolean
    language sql
    stable
    security definer
    set search_path = pg_catalog, public
    as $function$
      select
        public.has_permission('*')
        or exists (
          select 1
          from public.user_roles ur
          join public.profiles p on p.id = ur.user_id
          join public.role_resource_scopes rrs on rrs.role_code = ur.role_code
          where ur.user_id = (select auth.uid())
            and p.is_active = true
            and p.deleted_at is null
            and rrs.resource_code = requested_resource
            and rrs.action = requested_action
            and rrs.scope = any(accepted_scopes)
        );
    $function$;

    revoke all on function private.has_resource_scope(text, text, text[]) from public;
    grant execute on function private.has_resource_scope(text, text, text[]) to authenticated;
  $ddl$;
end;
$rls_scope$;

-- ============================================================
--  CORE RECORD OWNERSHIP (run after the RBAC migration chain)
-- ============================================================

do $record_ownership$
begin
  if to_regclass('public.profiles') is null then
    raise notice 'Skipping record ownership columns until RBAC migrations are applied.';
    return;
  end if;

  execute $ddl$
    alter table public.customers
      add column if not exists owner_user_id uuid
      references public.profiles(id) on delete set null;

    alter table public.leads
      add column if not exists owner_user_id uuid
      references public.profiles(id) on delete set null;

    alter table public.tour_drafts
      add column if not exists owner_user_id uuid
      references public.profiles(id) on delete set null;

    alter table public.bookings
      add column if not exists owner_user_id uuid
      references public.profiles(id) on delete set null,
      add column if not exists assigned_user_id uuid
      references public.profiles(id) on delete set null;

    alter table public.tasks
      add column if not exists creator_user_id uuid
      references public.profiles(id) on delete set null,
      add column if not exists assignee_user_id uuid
      references public.profiles(id) on delete set null;

    alter table public.comms
      add column if not exists access_owner_user_id uuid
      references public.profiles(id) on delete set null;

    create index if not exists idx_customers_owner_user_id
      on public.customers(owner_user_id);
    create index if not exists idx_leads_owner_user_id
      on public.leads(owner_user_id);
    create index if not exists idx_tour_drafts_owner_user_id
      on public.tour_drafts(owner_user_id);
    create index if not exists idx_bookings_owner_user_id
      on public.bookings(owner_user_id);
    create index if not exists idx_bookings_assigned_user_id
      on public.bookings(assigned_user_id);
    create index if not exists idx_tasks_creator_user_id
      on public.tasks(creator_user_id);
    create index if not exists idx_tasks_assignee_user_id
      on public.tasks(assignee_user_id);
    create index if not exists idx_comms_access_owner_user_id
      on public.comms(access_owner_user_id);
  $ddl$;
end;
$record_ownership$;

-- ============================================================
--  CORE OWNER ATTRIBUTION (run after the RBAC migration chain)
-- ============================================================

do $owner_attribution$
begin
  if to_regclass('public.profiles') is null then
    raise notice 'Skipping owner attribution triggers until RBAC migrations are applied.';
    return;
  end if;

  execute $ddl$
    create or replace function private.assign_customer_owner()
    returns trigger
    language plpgsql
    security definer
    set search_path = pg_catalog, public
    as $function$
    begin
      if auth.uid() is not null then
        new.owner_user_id := auth.uid();
      end if;

      return new;
    end;
    $function$;

    create or replace function private.assign_lead_owner()
    returns trigger
    language plpgsql
    security definer
    set search_path = pg_catalog, public
    as $function$
    declare
      inherited_owner_id uuid;
    begin
      if new.cust_id is not null then
        select owner_user_id
          into inherited_owner_id
          from public.customers
         where id = new.cust_id;
      end if;

      new.owner_user_id := coalesce(inherited_owner_id, auth.uid(), new.owner_user_id);
      return new;
    end;
    $function$;

    create or replace function private.assign_tour_draft_owner()
    returns trigger
    language plpgsql
    security definer
    set search_path = pg_catalog, public
    as $function$
    declare
      inherited_owner_id uuid;
    begin
      if new.lead_id is not null then
        select owner_user_id
          into inherited_owner_id
          from public.leads
         where id = new.lead_id;
      end if;

      if inherited_owner_id is null and new.cust_id is not null then
        select owner_user_id
          into inherited_owner_id
          from public.customers
         where id = new.cust_id;
      end if;

      new.owner_user_id := coalesce(inherited_owner_id, auth.uid(), new.owner_user_id);
      return new;
    end;
    $function$;

    create or replace function private.assign_booking_owner()
    returns trigger
    language plpgsql
    security definer
    set search_path = pg_catalog, public
    as $function$
    declare
      inherited_owner_id uuid;
    begin
      if new.lead_id is not null then
        select owner_user_id
          into inherited_owner_id
          from public.leads
         where id = new.lead_id;
      end if;

      if inherited_owner_id is null and new.cust_id is not null then
        select owner_user_id
          into inherited_owner_id
          from public.customers
         where id = new.cust_id;
      end if;

      new.owner_user_id := coalesce(inherited_owner_id, auth.uid(), new.owner_user_id);
      return new;
    end;
    $function$;

    create or replace function private.assign_task_creator()
    returns trigger
    language plpgsql
    security definer
    set search_path = pg_catalog, public
    as $function$
    begin
      if auth.uid() is not null then
        new.creator_user_id := auth.uid();
      end if;

      return new;
    end;
    $function$;

    create or replace function private.assign_comm_access_owner()
    returns trigger
    language plpgsql
    security definer
    set search_path = pg_catalog, public
    as $function$
    declare
      inherited_owner_id uuid;
    begin
      if new.cust_id is not null then
        select owner_user_id
          into inherited_owner_id
          from public.customers
         where id = new.cust_id;
      end if;

      new.access_owner_user_id := coalesce(
        inherited_owner_id,
        auth.uid(),
        new.access_owner_user_id
      );
      return new;
    end;
    $function$;

    revoke all on function private.assign_customer_owner() from public;
    revoke all on function private.assign_lead_owner() from public;
    revoke all on function private.assign_tour_draft_owner() from public;
    revoke all on function private.assign_booking_owner() from public;
    revoke all on function private.assign_task_creator() from public;
    revoke all on function private.assign_comm_access_owner() from public;

    drop trigger if exists trg_customers_assign_owner on public.customers;
    create trigger trg_customers_assign_owner
    before insert on public.customers
    for each row execute function private.assign_customer_owner();

    drop trigger if exists trg_leads_assign_owner on public.leads;
    create trigger trg_leads_assign_owner
    before insert on public.leads
    for each row execute function private.assign_lead_owner();

    drop trigger if exists trg_tour_drafts_assign_owner on public.tour_drafts;
    create trigger trg_tour_drafts_assign_owner
    before insert on public.tour_drafts
    for each row execute function private.assign_tour_draft_owner();

    drop trigger if exists trg_bookings_assign_owner on public.bookings;
    create trigger trg_bookings_assign_owner
    before insert on public.bookings
    for each row execute function private.assign_booking_owner();

    drop trigger if exists trg_tasks_assign_creator on public.tasks;
    create trigger trg_tasks_assign_creator
    before insert on public.tasks
    for each row execute function private.assign_task_creator();

    drop trigger if exists trg_comms_assign_access_owner on public.comms;
    create trigger trg_comms_assign_access_owner
    before insert on public.comms
    for each row execute function private.assign_comm_access_owner();
  $ddl$;
end;
$owner_attribution$;

-- ============================================================
--  ACCESS CONTROL RESOURCE SCOPES (run after access-control migrations)
-- ============================================================

do $access_control_resource_scopes$
begin
  if to_regclass('public.access_control_audit_logs') is null then
    raise notice 'Skipping Access Control RLS scopes until access-control migrations are applied.';
    return;
  end if;

  execute $ddl$
    create schema if not exists private;
    revoke all on schema private from public;

    -- ============================================================================
    -- Role-resource scope management. The public table remains unreadable to the
    -- client; these RPCs authorize each request and write an audit entry instead.
    -- ============================================================================

    create or replace function public.list_access_control_staff_role_resource_scopes()
    returns table (
      role_code text,
      resource_code text,
      action text,
      scope text
    )
    language plpgsql
    stable
    security definer
    set search_path = pg_catalog, public
    as $function$
    begin
      if not public.has_permission('users.manage') then
        raise exception 'Bạn không có quyền xem phạm vi dữ liệu của role.'
          using errcode = '42501';
      end if;

      return query
      select
        rrs.role_code,
        rrs.resource_code,
        rrs.action,
        rrs.scope
      from public.role_resource_scopes rrs
      join public.roles r on r.code = rrs.role_code
      where r.is_system = false
      order by rrs.role_code, rrs.resource_code, rrs.action;
    end;
    $function$;

    create or replace function public.replace_access_control_staff_role_resource_scopes(
      target_role_code text,
      requested_scopes jsonb
    )
    returns void
    language plpgsql
    security definer
    set search_path = pg_catalog, public
    as $function$
    declare
      old_scopes jsonb;
      normalized_scopes jsonb;
    begin
      if not public.has_permission('users.manage') then
        raise exception 'Bạn không có quyền cập nhật phạm vi dữ liệu của role.'
          using errcode = '42501';
      end if;

      if not exists (
        select 1
        from public.roles
        where code = target_role_code
          and is_system = false
      ) then
        raise exception 'Chỉ được chỉnh role nhân viên động.'
          using errcode = '22023';
      end if;

      if jsonb_typeof(coalesce(requested_scopes, '[]'::jsonb)) <> 'array' then
        raise exception 'Danh sách phạm vi dữ liệu không hợp lệ.'
          using errcode = '22023';
      end if;

      if exists (
        with requested as (
          select
            lower(trim(input.resource_code)) as resource_code,
            lower(trim(input.action)) as action,
            lower(trim(input.scope)) as scope
          from jsonb_to_recordset(coalesce(requested_scopes, '[]'::jsonb))
            as input(resource_code text, action text, scope text)
        )
        select 1
        from requested
        where resource_code is null
          or action is null
          or scope is null
          or resource_code not in (
            'customers', 'leads', 'tour_drafts', 'bookings', 'tasks', 'comms'
          )
          or action not in ('read', 'write', 'delete')
          or scope not in ('own', 'assigned', 'all')
      ) then
        raise exception 'Danh sách phạm vi dữ liệu không hợp lệ.'
          using errcode = '22023';
      end if;

      if exists (
        with requested as (
          select
            lower(trim(input.resource_code)) as resource_code,
            lower(trim(input.action)) as action
          from jsonb_to_recordset(coalesce(requested_scopes, '[]'::jsonb))
            as input(resource_code text, action text, scope text)
        )
        select 1
        from requested
        group by resource_code, action
        having count(*) > 1
      ) then
        raise exception 'Mỗi resource chỉ có một scope cho mỗi action.'
          using errcode = '22023';
      end if;

      select coalesce(
        jsonb_agg(
          jsonb_build_object(
            'resource_code', resource_code,
            'action', action,
            'scope', scope
          )
          order by resource_code, action
        ),
        '[]'::jsonb
      )
      into old_scopes
      from public.role_resource_scopes
      where role_code = target_role_code;

      select coalesce(
        jsonb_agg(
          jsonb_build_object(
            'resource_code', resource_code,
            'action', action,
            'scope', scope
          )
          order by resource_code, action
        ),
        '[]'::jsonb
      )
      into normalized_scopes
      from (
        select
          lower(trim(input.resource_code)) as resource_code,
          lower(trim(input.action)) as action,
          lower(trim(input.scope)) as scope
        from jsonb_to_recordset(coalesce(requested_scopes, '[]'::jsonb))
          as input(resource_code text, action text, scope text)
      ) requested;

      delete from public.role_resource_scopes
      where role_code = target_role_code;

      insert into public.role_resource_scopes (
        role_code,
        resource_code,
        action,
        scope
      )
      select
        target_role_code,
        resource_code,
        action,
        scope
      from jsonb_to_recordset(normalized_scopes)
        as input(resource_code text, action text, scope text);

      insert into public.access_control_audit_logs (
        actor_user_id,
        action,
        before_value,
        after_value
      )
      values (
        auth.uid(),
        'staff_role_resource_scopes_replaced',
        jsonb_build_object(
          'role_code', target_role_code,
          'scopes', old_scopes
        ),
        jsonb_build_object(
          'role_code', target_role_code,
          'scopes', normalized_scopes
        )
      );
    end;
    $function$;

    revoke all on function public.list_access_control_staff_role_resource_scopes() from public;
    revoke all on function public.replace_access_control_staff_role_resource_scopes(text, jsonb) from public;
    grant execute on function public.list_access_control_staff_role_resource_scopes() to authenticated;
    grant execute on function public.replace_access_control_staff_role_resource_scopes(text, jsonb) to authenticated;

    -- ============================================================================
    -- Only controlled RPCs may reassign the columns that future RLS policies use.
    -- ============================================================================

    create or replace function private.protect_core_record_access_columns()
    returns trigger
    language plpgsql
    security definer
    set search_path = pg_catalog, public
    as $function$
    declare
      protected_column text;
    begin
      if current_setting('app.allow_core_record_access_change', true) = 'true' then
        return new;
      end if;

      foreach protected_column in array tg_argv loop
        if (to_jsonb(old) -> protected_column) is distinct from
           (to_jsonb(new) -> protected_column) then
          raise exception 'Không thể đổi quyền sở hữu trực tiếp.'
            using errcode = '42501';
        end if;
      end loop;

      return new;
    end;
    $function$;

    create or replace function public.reassign_core_record_owner(
      target_resource_code text,
      target_record_id text,
      new_owner_user_id uuid
    )
    returns void
    language plpgsql
    security definer
    set search_path = pg_catalog, public
    as $function$
    declare
      previous_owner_user_id uuid;
    begin
      if not public.has_permission('users.manage') then
        raise exception 'Bạn không có quyền chuyển ownership dữ liệu.'
          using errcode = '42501';
      end if;

      if target_resource_code not in (
        'customers', 'leads', 'tour_drafts', 'bookings', 'comms'
      ) or nullif(trim(target_record_id), '') is null then
        raise exception 'Bản ghi ownership không hợp lệ.'
          using errcode = '22023';
      end if;

      if new_owner_user_id is not null and not exists (
        select 1
        from public.profiles
        where id = new_owner_user_id
          and is_active = true
          and deleted_at is null
      ) then
        raise exception 'Người nhận ownership không hợp lệ.'
          using errcode = '22023';
      end if;

      case target_resource_code
        when 'customers' then
          select owner_user_id into previous_owner_user_id from public.customers where id = target_record_id;
        when 'leads' then
          select owner_user_id into previous_owner_user_id from public.leads where id = target_record_id;
        when 'tour_drafts' then
          select owner_user_id into previous_owner_user_id from public.tour_drafts where id = target_record_id;
        when 'bookings' then
          select owner_user_id into previous_owner_user_id from public.bookings where id = target_record_id;
        when 'comms' then
          select access_owner_user_id into previous_owner_user_id from public.comms where id = target_record_id;
      end case;

      if not found then
        raise exception 'Không tìm thấy bản ghi cần chuyển ownership.'
          using errcode = '22023';
      end if;

      perform set_config('app.allow_core_record_access_change', 'true', true);

      case target_resource_code
        when 'customers' then update public.customers set owner_user_id = new_owner_user_id where id = target_record_id;
        when 'leads' then update public.leads set owner_user_id = new_owner_user_id where id = target_record_id;
        when 'tour_drafts' then update public.tour_drafts set owner_user_id = new_owner_user_id where id = target_record_id;
        when 'bookings' then update public.bookings set owner_user_id = new_owner_user_id where id = target_record_id;
        when 'comms' then update public.comms set access_owner_user_id = new_owner_user_id where id = target_record_id;
      end case;

      insert into public.access_control_audit_logs (actor_user_id, action, before_value, after_value)
      values (
        auth.uid(),
        'core_record_owner_reassigned',
        jsonb_build_object('resource_code', target_resource_code, 'record_id', target_record_id, 'owner_user_id', previous_owner_user_id),
        jsonb_build_object('resource_code', target_resource_code, 'record_id', target_record_id, 'owner_user_id', new_owner_user_id)
      );
    end;
    $function$;

    create or replace function public.set_core_record_assignee(
      target_resource_code text,
      target_record_id text,
      new_assignee_user_id uuid
    )
    returns void
    language plpgsql
    security definer
    set search_path = pg_catalog, public
    as $function$
    declare
      previous_assignee_user_id uuid;
    begin
      if not public.has_permission('users.manage') then
        raise exception 'Bạn không có quyền phân công dữ liệu.'
          using errcode = '42501';
      end if;

      if target_resource_code not in ('bookings', 'tasks')
        or nullif(trim(target_record_id), '') is null then
        raise exception 'Bản ghi phân công không hợp lệ.'
          using errcode = '22023';
      end if;

      if new_assignee_user_id is not null and not exists (
        select 1
        from public.profiles
        where id = new_assignee_user_id
          and is_active = true
          and deleted_at is null
      ) then
        raise exception 'Người được phân công không hợp lệ.'
          using errcode = '22023';
      end if;

      if target_resource_code = 'bookings' then
        select assigned_user_id into previous_assignee_user_id from public.bookings where id = target_record_id;
      else
        select assignee_user_id into previous_assignee_user_id from public.tasks where id = target_record_id;
      end if;

      if not found then
        raise exception 'Không tìm thấy bản ghi cần phân công.'
          using errcode = '22023';
      end if;

      perform set_config('app.allow_core_record_access_change', 'true', true);

      if target_resource_code = 'bookings' then
        update public.bookings set assigned_user_id = new_assignee_user_id where id = target_record_id;
      else
        update public.tasks set assignee_user_id = new_assignee_user_id where id = target_record_id;
      end if;

      insert into public.access_control_audit_logs (actor_user_id, action, before_value, after_value)
      values (
        auth.uid(),
        'core_record_assignee_changed',
        jsonb_build_object('resource_code', target_resource_code, 'record_id', target_record_id, 'assignee_user_id', previous_assignee_user_id),
        jsonb_build_object('resource_code', target_resource_code, 'record_id', target_record_id, 'assignee_user_id', new_assignee_user_id)
      );
    end;
    $function$;

    revoke all on function private.protect_core_record_access_columns() from public;
    revoke all on function public.reassign_core_record_owner(text, text, uuid) from public;
    revoke all on function public.set_core_record_assignee(text, text, uuid) from public;
    grant execute on function public.reassign_core_record_owner(text, text, uuid) to authenticated;
    grant execute on function public.set_core_record_assignee(text, text, uuid) to authenticated;

    drop trigger if exists trg_customers_protect_access_columns on public.customers;
    create trigger trg_customers_protect_access_columns
    before update on public.customers
    for each row execute function private.protect_core_record_access_columns('owner_user_id');

    drop trigger if exists trg_leads_protect_access_columns on public.leads;
    create trigger trg_leads_protect_access_columns
    before update on public.leads
    for each row execute function private.protect_core_record_access_columns('owner_user_id');

    drop trigger if exists trg_tour_drafts_protect_access_columns on public.tour_drafts;
    create trigger trg_tour_drafts_protect_access_columns
    before update on public.tour_drafts
    for each row execute function private.protect_core_record_access_columns('owner_user_id');

    drop trigger if exists trg_bookings_protect_access_columns on public.bookings;
    create trigger trg_bookings_protect_access_columns
    before update on public.bookings
    for each row execute function private.protect_core_record_access_columns('owner_user_id', 'assigned_user_id');

    drop trigger if exists trg_tasks_protect_access_columns on public.tasks;
    create trigger trg_tasks_protect_access_columns
    before update on public.tasks
    for each row execute function private.protect_core_record_access_columns('creator_user_id', 'assignee_user_id');

    drop trigger if exists trg_comms_protect_access_columns on public.comms;
    create trigger trg_comms_protect_access_columns
    before update on public.comms
    for each row execute function private.protect_core_record_access_columns('access_owner_user_id');

  $ddl$;
end;
$access_control_resource_scopes$;

-- ============================================================
--  CORE RESOURCE RLS ENFORCEMENT (current CRM phase)
--
--  This schema mirror follows migration
--  20260816111141_enforce_core_resource_rls.sql. The migration remains
--  canonical; this guarded block keeps new SQL-editor environments aligned.
-- ============================================================

do $core_resource_rls$
declare
  root_resource record;
  child_resource record;
  access_predicate text;
  table_name text;
  action_name text;
begin
  if to_regclass('public.role_resource_scopes') is null
    or to_regclass('public.customers') is null
    or to_regclass('public.leads') is null
    or to_regclass('public.tour_drafts') is null
    or to_regclass('public.bookings') is null
    or to_regclass('public.tasks') is null
    or to_regclass('public.comms') is null then
    raise notice 'Skipping core resource RLS until the RBAC and core CRM schema are available.';
    return;
  end if;

  create index if not exists idx_booking_changes_booking_id
    on public.booking_changes(booking_id);
  create index if not exists idx_booking_activities_itinerary_id
    on public.booking_activities(itinerary_id);

  execute $ddl$
    create or replace function private.can_access_core_resource(
      requested_resource text,
      requested_action text,
      accepted_scopes text[]
    )
    returns boolean
    language plpgsql
    stable
    security definer
    set search_path = pg_catalog, public
    as $function$
    declare
      required_permission text;
    begin
      required_permission := case
        when requested_resource = 'customers' and requested_action = 'read' then 'customers.read'
        when requested_resource = 'customers' then 'customers.write'
        when requested_resource = 'leads' and requested_action = 'read' then 'sales.read'
        when requested_resource = 'leads' then 'sales.write'
        when requested_resource = 'tour_drafts' and requested_action = 'read' then 'tour_design.read'
        when requested_resource = 'tour_drafts' then 'tour_design.write'
        when requested_resource = 'bookings' and requested_action = 'read' then 'bookings.read'
        when requested_resource = 'bookings' then 'bookings.write'
        when requested_resource = 'tasks' and requested_action = 'read' then 'planner.read'
        when requested_resource = 'tasks' then 'planner.write'
        when requested_resource = 'comms' and requested_action = 'read' then 'customers.read'
        when requested_resource = 'comms' then 'customers.write'
        else null
      end;

      if required_permission is null
        or requested_action not in ('read', 'write', 'delete') then
        return false;
      end if;

      if exists (
        select 1
        from public.user_roles ur
        join public.profiles p on p.id = ur.user_id
        where ur.user_id = (select auth.uid())
          and ur.role_code in ('admin', 'super_admin')
          and p.is_active = true
          and p.deleted_at is null
      ) then
        return true;
      end if;

      return public.has_permission(required_permission)
        and private.has_resource_scope(
          requested_resource,
          requested_action,
          accepted_scopes
        );
    end;
    $function$;

    create or replace function private.can_access_tour_draft_record(
      target_draft_id text,
      requested_action text
    )
    returns boolean
    language sql
    stable
    security definer
    set search_path = pg_catalog, public
    as $function$
      select
        (select private.can_access_core_resource(
          'tour_drafts', requested_action, array['all']
        ))
        or exists (
          select 1
          from public.tour_drafts td
          where td.id = target_draft_id
            and td.owner_user_id = (select auth.uid())
            and (select private.can_access_core_resource(
              'tour_drafts', requested_action, array['own']
            ))
        );
    $function$;

    create or replace function private.can_access_booking_record(
      target_booking_id text,
      requested_action text
    )
    returns boolean
    language sql
    stable
    security definer
    set search_path = pg_catalog, public
    as $function$
      select
        (select private.can_access_core_resource(
          'bookings', requested_action, array['all']
        ))
        or exists (
          select 1
          from public.bookings b
          where b.id = target_booking_id
            and (
              (
                b.owner_user_id = (select auth.uid())
                and (select private.can_access_core_resource(
                  'bookings', requested_action, array['own']
                ))
              )
              or (
                b.assigned_user_id = (select auth.uid())
                and (select private.can_access_core_resource(
                  'bookings', requested_action, array['assigned']
                ))
              )
            )
        );
    $function$;

    create or replace function private.can_access_booking_activity_record(
      target_itinerary_id uuid,
      requested_action text
    )
    returns boolean
    language sql
    stable
    security definer
    set search_path = pg_catalog, public
    as $function$
      select exists (
        select 1
        from public.booking_itinerary bi
        where bi.id = target_itinerary_id
          and private.can_access_booking_record(bi.booking_id, requested_action)
      );
    $function$;

    revoke all on function private.can_access_core_resource(text, text, text[]) from public;
    revoke all on function private.can_access_tour_draft_record(text, text) from public;
    revoke all on function private.can_access_booking_record(text, text) from public;
    revoke all on function private.can_access_booking_activity_record(uuid, text) from public;
    grant execute on function private.can_access_core_resource(text, text, text[]) to authenticated;
    grant execute on function private.can_access_tour_draft_record(text, text) to authenticated;
    grant execute on function private.can_access_booking_record(text, text) to authenticated;
    grant execute on function private.can_access_booking_activity_record(uuid, text) to authenticated;

    revoke all on table
      public.customers,
      public.leads,
      public.tour_drafts,
      public.tour_outline_days,
      public.bookings,
      public.booking_changes,
      public.booking_itinerary,
      public.booking_activities,
      public.tasks,
      public.comms
    from anon;

    grant select, insert, update, delete on table
      public.customers,
      public.leads,
      public.tour_drafts,
      public.tour_outline_days,
      public.bookings,
      public.booking_changes,
      public.booking_itinerary,
      public.booking_activities,
      public.tasks,
      public.comms
    to authenticated;
  $ddl$;

  foreach table_name in array array[
    'customers', 'leads', 'tour_drafts', 'tour_outline_days', 'bookings',
    'booking_changes', 'booking_itinerary', 'booking_activities', 'tasks', 'comms'
  ] loop
    execute format('drop policy if exists authenticated_access on public.%I', table_name);
  end loop;

  for root_resource in
    select *
    from (values
      ('customers', 'customers', 'owner_user_id', null::text),
      ('leads', 'leads', 'owner_user_id', null::text),
      ('tour_drafts', 'tour_drafts', 'owner_user_id', null::text),
      ('bookings', 'bookings', 'owner_user_id', 'assigned_user_id'),
      ('tasks', 'tasks', 'creator_user_id', 'assignee_user_id'),
      ('comms', 'comms', 'access_owner_user_id', null::text)
    ) as resources(table_name, resource_code, owner_column, assigned_column)
  loop
    execute format('alter table public.%I enable row level security', root_resource.table_name);

    foreach action_name in array array['select', 'insert', 'update', 'delete'] loop
      execute format(
        'drop policy if exists %I on public.%I',
        'rls_' || root_resource.table_name || '_' || action_name,
        root_resource.table_name
      );
    end loop;

    access_predicate := format(
      '(select private.can_access_core_resource(%L, %L, array[''all''])) or (%I = (select auth.uid()) and (select private.can_access_core_resource(%L, %L, array[''own''])))',
      root_resource.resource_code,
      'read',
      root_resource.owner_column,
      root_resource.resource_code,
      'read'
    );
    if root_resource.assigned_column is not null then
      access_predicate := access_predicate || format(
        ' or (%I = (select auth.uid()) and (select private.can_access_core_resource(%L, %L, array[''assigned''])))',
        root_resource.assigned_column,
        root_resource.resource_code,
        'read'
      );
    end if;
    execute format(
      'create policy %I on public.%I for select to authenticated using (%s)',
      'rls_' || root_resource.table_name || '_select',
      root_resource.table_name,
      access_predicate
    );

    access_predicate := replace(access_predicate, '''read''', '''write''');
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (%s)',
      'rls_' || root_resource.table_name || '_insert',
      root_resource.table_name,
      access_predicate
    );
    execute format(
      'create policy %I on public.%I for update to authenticated using (%s) with check (%s)',
      'rls_' || root_resource.table_name || '_update',
      root_resource.table_name,
      access_predicate,
      access_predicate
    );

    access_predicate := replace(access_predicate, '''write''', '''delete''');
    execute format(
      'create policy %I on public.%I for delete to authenticated using (%s)',
      'rls_' || root_resource.table_name || '_delete',
      root_resource.table_name,
      access_predicate
    );
  end loop;

  for child_resource in
    select *
    from (values
      ('tour_outline_days', 'draft_id', 'private.can_access_tour_draft_record'),
      ('booking_changes', 'booking_id', 'private.can_access_booking_record'),
      ('booking_itinerary', 'booking_id', 'private.can_access_booking_record'),
      ('booking_activities', 'itinerary_id', 'private.can_access_booking_activity_record')
    ) as resources(table_name, parent_column, access_function)
  loop
    execute format('alter table public.%I enable row level security', child_resource.table_name);

    foreach action_name in array array['select', 'insert', 'update', 'delete'] loop
      execute format(
        'drop policy if exists %I on public.%I',
        'rls_' || child_resource.table_name || '_' || action_name,
        child_resource.table_name
      );
    end loop;

    execute format(
      'create policy %I on public.%I for select to authenticated using (%s(%I, %L))',
      'rls_' || child_resource.table_name || '_select',
      child_resource.table_name,
      child_resource.access_function,
      child_resource.parent_column,
      'read'
    );
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (%s(%I, %L))',
      'rls_' || child_resource.table_name || '_insert',
      child_resource.table_name,
      child_resource.access_function,
      child_resource.parent_column,
      'write'
    );
    execute format(
      'create policy %I on public.%I for update to authenticated using (%s(%I, %L)) with check (%s(%I, %L))',
      'rls_' || child_resource.table_name || '_update',
      child_resource.table_name,
      child_resource.access_function,
      child_resource.parent_column,
      'write',
      child_resource.access_function,
      child_resource.parent_column,
      'write'
    );
    execute format(
      'create policy %I on public.%I for delete to authenticated using (%s(%I, %L))',
      'rls_' || child_resource.table_name || '_delete',
      child_resource.table_name,
      child_resource.access_function,
      child_resource.parent_column,
      'delete'
    );
  end loop;
end;
$core_resource_rls$;

-- ============================================================
--  END OF SCHEMA v5.0
-- ============================================================
