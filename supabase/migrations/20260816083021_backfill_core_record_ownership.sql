-- Backfill only ownership that can be established from a stable identifier.
-- Legacy display names are deliberately never matched: an unmatched record
-- remains NULL and will be handled by an administrator before own-scope RLS
-- is enabled.
begin;

-- A legacy principal is eligible only when it exactly matches one active,
-- non-deleted profile email. The GROUP BY prevents ambiguity from mapping to
-- an arbitrary account if profile emails are ever duplicated.
with unique_active_profile_emails as (
  select
    lower(btrim(email)) as email_key,
    min(id::text)::uuid as user_id
  from public.profiles
  where nullif(btrim(email), '') is not null
    and is_active = true
    and deleted_at is null
  group by lower(btrim(email))
  having count(*) = 1
)
update public.customers c
set owner_user_id = profile_match.user_id
from unique_active_profile_emails profile_match
where c.owner_user_id is null
  and lower(btrim(c.salesperson)) = profile_match.email_key;

with unique_active_profile_emails as (
  select
    lower(btrim(email)) as email_key,
    min(id::text)::uuid as user_id
  from public.profiles
  where nullif(btrim(email), '') is not null
    and is_active = true
    and deleted_at is null
  group by lower(btrim(email))
  having count(*) = 1
)
update public.leads l
set owner_user_id = profile_match.user_id
from unique_active_profile_emails profile_match
where l.owner_user_id is null
  and lower(btrim(l.owner)) = profile_match.email_key;

-- A Lead without a resolvable legacy owner inherits its Customer owner.
update public.leads l
set owner_user_id = c.owner_user_id
from public.customers c
where l.owner_user_id is null
  and l.cust_id = c.id
  and c.owner_user_id is not null;

-- Child records inherit from the closest trustworthy parent. Each statement
-- is idempotent and never overwrites an owner assigned before this migration.
update public.tour_drafts td
set owner_user_id = l.owner_user_id
from public.leads l
where td.owner_user_id is null
  and td.lead_id = l.id
  and l.owner_user_id is not null;

update public.tour_drafts td
set owner_user_id = c.owner_user_id
from public.customers c
where td.owner_user_id is null
  and td.cust_id = c.id
  and c.owner_user_id is not null;

update public.bookings b
set owner_user_id = l.owner_user_id
from public.leads l
where b.owner_user_id is null
  and b.lead_id = l.id
  and l.owner_user_id is not null;

update public.bookings b
set owner_user_id = c.owner_user_id
from public.customers c
where b.owner_user_id is null
  and b.cust_id = c.id
  and c.owner_user_id is not null;

with unique_active_profile_emails as (
  select
    lower(btrim(email)) as email_key,
    min(id::text)::uuid as user_id
  from public.profiles
  where nullif(btrim(email), '') is not null
    and is_active = true
    and deleted_at is null
  group by lower(btrim(email))
  having count(*) = 1
)
update public.tasks t
set assignee_user_id = profile_match.user_id
from unique_active_profile_emails profile_match
where t.assignee_user_id is null
  and lower(btrim(t.assignee)) = profile_match.email_key;

-- Tasks have no reliable legacy creator field, so creator_user_id intentionally
-- remains NULL for historical rows. It will be populated for new rows by the
-- BEFORE INSERT trigger added in the previous migration.
update public.comms cm
set access_owner_user_id = c.owner_user_id
from public.customers c
where cm.access_owner_user_id is null
  and cm.cust_id = c.id
  and c.owner_user_id is not null;

do $backfill_report$
declare
  customers_without_owner bigint;
  leads_without_owner bigint;
  drafts_without_owner bigint;
  bookings_without_owner bigint;
  tasks_without_creator bigint;
  tasks_without_assignee bigint;
  comms_without_owner bigint;
begin
  select count(*) into customers_without_owner from public.customers where owner_user_id is null;
  select count(*) into leads_without_owner from public.leads where owner_user_id is null;
  select count(*) into drafts_without_owner from public.tour_drafts where owner_user_id is null;
  select count(*) into bookings_without_owner from public.bookings where owner_user_id is null;
  select count(*) into tasks_without_creator from public.tasks where creator_user_id is null;
  select count(*) into tasks_without_assignee from public.tasks where assignee_user_id is null;
  select count(*) into comms_without_owner from public.comms where access_owner_user_id is null;

  raise notice
    'RLS ownership backfill remaining nulls: customers=%, leads=%, tour_drafts=%, bookings=%, tasks.creator=%, tasks.assignee=%, comms=%',
    customers_without_owner,
    leads_without_owner,
    drafts_without_owner,
    bookings_without_owner,
    tasks_without_creator,
    tasks_without_assignee,
    comms_without_owner;
end;
$backfill_report$;

commit;
