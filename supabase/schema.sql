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
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

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

create index if not exists idx_weather_cache_dest on weather_forecast_cache(destination_id);
create index if not exists idx_weather_cache_date on weather_forecast_cache(forecast_date);
create index if not exists idx_weather_cache_expires on weather_forecast_cache(expires_at);
create index if not exists idx_weather_fetch_log_at on weather_fetch_log(fetched_at desc);

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
    'company_branding',
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
--  END OF SCHEMA v5.0
-- ============================================================
