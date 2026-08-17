-- Core ownership columns for staged RLS enforcement.
-- Columns are nullable until existing records are mapped to authenticated users.

begin;

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

commit;
