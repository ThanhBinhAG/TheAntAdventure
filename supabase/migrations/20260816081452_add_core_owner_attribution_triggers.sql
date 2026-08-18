-- Attribute ownership for newly created core CRM records. These triggers do
-- not backfill existing rows or run on UPDATE; later RLS policies will use
-- these columns to filter data by the caller's configured scope.
begin;

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

commit;
