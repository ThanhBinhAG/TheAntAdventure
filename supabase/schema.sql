-- ============================================================
--  THE ANT ADVENTURES CRM — PostgreSQL Schema v5.0
--  Supabase-ready · Fully relational · No JSONB
--  Generated: 2026-06-15
--
--  Documentation: docs/DATABASE.md
--
--  Run order (new Supabase project):
--    1. Paste this file → Supabase SQL Editor → Run
--    2. Seed data via SQL scripts or app (after app layer v5 refactor)
--
--  Migrating from v4.3 JSONB tables:
--    1. Backup data first
--    2. Run supabase/migrate-drop-v43.sql
--    3. Run this file
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
  price_from      text,                            -- app: price (display string)
  region          text,                            -- north | central | south | national
  created_at      timestamptz default now(),
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
  created_at      timestamptz default now(),
  updated_at      timestamptz default now(),
  constraint chk_leads_stage check (stage in (
    'Inquiry','Designing','Quoted','Negotiation',
    'Confirmed','On Tour','Completed','Lost','Pending'
  ))
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

-- ============================================================
--  MODULE 13 · GALLERY
-- ============================================================

create table if not exists photos (
  id              text primary key,                -- PH-001
  caption         text,
  region          text,
  product_code    text references products(code) on delete set null,  -- app: product
  url             text,
  created_at      timestamptz default now()
);

create table if not exists photo_tags (
  photo_id        text not null references photos(id) on delete cascade,
  tag             text not null,
  primary key (photo_id, tag)
);

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

-- ============================================================
--  ROW LEVEL SECURITY (development — tighten before production)
-- ============================================================

do $$
declare
  t text;
begin
  foreach t in array array[
    'agents','customers','products','guides','guide_reviews','leads',
    'bookings','booking_changes','booking_itinerary','booking_activities',
    'comms','finance','accounts_receivable','accounts_payable','tax_reports',
    'staff','salary_records','tasks','contracts','feedback',
    'suppliers','supplier_tags','cruises','transport','restaurants',
    'photos','photo_tags','cal_events',
    'chat_channels','chat_messages','chat_reactions','dev_notes'
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

drop trigger if exists trg_updated_at on dev_notes;
create trigger trg_updated_at before update on dev_notes
  for each row execute procedure set_updated_at();

-- ============================================================
--  END OF SCHEMA v5.0
-- ============================================================