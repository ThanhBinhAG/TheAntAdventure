-- Enforce the first production RLS phase for the current core CRM resources.
-- The policy is the intersection of RBAC and the role's configured data scope.
-- Booking and Tour Draft child tables inherit access from their protected parent.

begin;

-- These foreign-key indexes keep the parent visibility checks used by RLS fast.
create index if not exists idx_booking_changes_booking_id
  on public.booking_changes(booking_id);

create index if not exists idx_booking_activities_itinerary_id
  on public.booking_activities(itinerary_id);

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

  -- Admin and Super Admin are fixed system roles and retain their established
  -- full CRM access. All configurable staff roles need both RBAC and scope.
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

-- Replace the temporary authenticated_access policy on exactly the tables
-- protected in this phase. Other current-phase tables remain unchanged.
drop policy if exists authenticated_access on public.customers;
drop policy if exists authenticated_access on public.leads;
drop policy if exists authenticated_access on public.tour_drafts;
drop policy if exists authenticated_access on public.tour_outline_days;
drop policy if exists authenticated_access on public.bookings;
drop policy if exists authenticated_access on public.booking_changes;
drop policy if exists authenticated_access on public.booking_itinerary;
drop policy if exists authenticated_access on public.booking_activities;
drop policy if exists authenticated_access on public.tasks;
drop policy if exists authenticated_access on public.comms;

alter table public.customers enable row level security;
create policy rls_customers_select on public.customers
  for select to authenticated using (
    (select private.can_access_core_resource('customers', 'read', array['all']))
    or (
      owner_user_id = (select auth.uid())
      and (select private.can_access_core_resource('customers', 'read', array['own']))
    )
  );
create policy rls_customers_insert on public.customers
  for insert to authenticated with check (
    (select private.can_access_core_resource('customers', 'write', array['all']))
    or (
      owner_user_id = (select auth.uid())
      and (select private.can_access_core_resource('customers', 'write', array['own']))
    )
  );
create policy rls_customers_update on public.customers
  for update to authenticated using (
    (select private.can_access_core_resource('customers', 'write', array['all']))
    or (
      owner_user_id = (select auth.uid())
      and (select private.can_access_core_resource('customers', 'write', array['own']))
    )
  ) with check (
    (select private.can_access_core_resource('customers', 'write', array['all']))
    or (
      owner_user_id = (select auth.uid())
      and (select private.can_access_core_resource('customers', 'write', array['own']))
    )
  );
create policy rls_customers_delete on public.customers
  for delete to authenticated using (
    (select private.can_access_core_resource('customers', 'delete', array['all']))
    or (
      owner_user_id = (select auth.uid())
      and (select private.can_access_core_resource('customers', 'delete', array['own']))
    )
  );

alter table public.leads enable row level security;
create policy rls_leads_select on public.leads
  for select to authenticated using (
    (select private.can_access_core_resource('leads', 'read', array['all']))
    or (
      owner_user_id = (select auth.uid())
      and (select private.can_access_core_resource('leads', 'read', array['own']))
    )
  );
create policy rls_leads_insert on public.leads
  for insert to authenticated with check (
    (select private.can_access_core_resource('leads', 'write', array['all']))
    or (
      owner_user_id = (select auth.uid())
      and (select private.can_access_core_resource('leads', 'write', array['own']))
    )
  );
create policy rls_leads_update on public.leads
  for update to authenticated using (
    (select private.can_access_core_resource('leads', 'write', array['all']))
    or (
      owner_user_id = (select auth.uid())
      and (select private.can_access_core_resource('leads', 'write', array['own']))
    )
  ) with check (
    (select private.can_access_core_resource('leads', 'write', array['all']))
    or (
      owner_user_id = (select auth.uid())
      and (select private.can_access_core_resource('leads', 'write', array['own']))
    )
  );
create policy rls_leads_delete on public.leads
  for delete to authenticated using (
    (select private.can_access_core_resource('leads', 'delete', array['all']))
    or (
      owner_user_id = (select auth.uid())
      and (select private.can_access_core_resource('leads', 'delete', array['own']))
    )
  );

alter table public.tour_drafts enable row level security;
create policy rls_tour_drafts_select on public.tour_drafts
  for select to authenticated using (
    (select private.can_access_core_resource('tour_drafts', 'read', array['all']))
    or (
      owner_user_id = (select auth.uid())
      and (select private.can_access_core_resource('tour_drafts', 'read', array['own']))
    )
  );
create policy rls_tour_drafts_insert on public.tour_drafts
  for insert to authenticated with check (
    (select private.can_access_core_resource('tour_drafts', 'write', array['all']))
    or (
      owner_user_id = (select auth.uid())
      and (select private.can_access_core_resource('tour_drafts', 'write', array['own']))
    )
  );
create policy rls_tour_drafts_update on public.tour_drafts
  for update to authenticated using (
    (select private.can_access_core_resource('tour_drafts', 'write', array['all']))
    or (
      owner_user_id = (select auth.uid())
      and (select private.can_access_core_resource('tour_drafts', 'write', array['own']))
    )
  ) with check (
    (select private.can_access_core_resource('tour_drafts', 'write', array['all']))
    or (
      owner_user_id = (select auth.uid())
      and (select private.can_access_core_resource('tour_drafts', 'write', array['own']))
    )
  );
create policy rls_tour_drafts_delete on public.tour_drafts
  for delete to authenticated using (
    (select private.can_access_core_resource('tour_drafts', 'delete', array['all']))
    or (
      owner_user_id = (select auth.uid())
      and (select private.can_access_core_resource('tour_drafts', 'delete', array['own']))
    )
  );

alter table public.bookings enable row level security;
create policy rls_bookings_select on public.bookings
  for select to authenticated using (
    (select private.can_access_core_resource('bookings', 'read', array['all']))
    or (
      owner_user_id = (select auth.uid())
      and (select private.can_access_core_resource('bookings', 'read', array['own']))
    )
    or (
      assigned_user_id = (select auth.uid())
      and (select private.can_access_core_resource('bookings', 'read', array['assigned']))
    )
  );
create policy rls_bookings_insert on public.bookings
  for insert to authenticated with check (
    (select private.can_access_core_resource('bookings', 'write', array['all']))
    or (
      owner_user_id = (select auth.uid())
      and (select private.can_access_core_resource('bookings', 'write', array['own']))
    )
    or (
      assigned_user_id = (select auth.uid())
      and (select private.can_access_core_resource('bookings', 'write', array['assigned']))
    )
  );
create policy rls_bookings_update on public.bookings
  for update to authenticated using (
    (select private.can_access_core_resource('bookings', 'write', array['all']))
    or (
      owner_user_id = (select auth.uid())
      and (select private.can_access_core_resource('bookings', 'write', array['own']))
    )
    or (
      assigned_user_id = (select auth.uid())
      and (select private.can_access_core_resource('bookings', 'write', array['assigned']))
    )
  ) with check (
    (select private.can_access_core_resource('bookings', 'write', array['all']))
    or (
      owner_user_id = (select auth.uid())
      and (select private.can_access_core_resource('bookings', 'write', array['own']))
    )
    or (
      assigned_user_id = (select auth.uid())
      and (select private.can_access_core_resource('bookings', 'write', array['assigned']))
    )
  );
create policy rls_bookings_delete on public.bookings
  for delete to authenticated using (
    (select private.can_access_core_resource('bookings', 'delete', array['all']))
    or (
      owner_user_id = (select auth.uid())
      and (select private.can_access_core_resource('bookings', 'delete', array['own']))
    )
    or (
      assigned_user_id = (select auth.uid())
      and (select private.can_access_core_resource('bookings', 'delete', array['assigned']))
    )
  );

alter table public.tasks enable row level security;
create policy rls_tasks_select on public.tasks
  for select to authenticated using (
    (select private.can_access_core_resource('tasks', 'read', array['all']))
    or (
      creator_user_id = (select auth.uid())
      and (select private.can_access_core_resource('tasks', 'read', array['own']))
    )
    or (
      assignee_user_id = (select auth.uid())
      and (select private.can_access_core_resource('tasks', 'read', array['assigned']))
    )
  );
create policy rls_tasks_insert on public.tasks
  for insert to authenticated with check (
    (select private.can_access_core_resource('tasks', 'write', array['all']))
    or (
      creator_user_id = (select auth.uid())
      and (select private.can_access_core_resource('tasks', 'write', array['own']))
    )
    or (
      assignee_user_id = (select auth.uid())
      and (select private.can_access_core_resource('tasks', 'write', array['assigned']))
    )
  );
create policy rls_tasks_update on public.tasks
  for update to authenticated using (
    (select private.can_access_core_resource('tasks', 'write', array['all']))
    or (
      creator_user_id = (select auth.uid())
      and (select private.can_access_core_resource('tasks', 'write', array['own']))
    )
    or (
      assignee_user_id = (select auth.uid())
      and (select private.can_access_core_resource('tasks', 'write', array['assigned']))
    )
  ) with check (
    (select private.can_access_core_resource('tasks', 'write', array['all']))
    or (
      creator_user_id = (select auth.uid())
      and (select private.can_access_core_resource('tasks', 'write', array['own']))
    )
    or (
      assignee_user_id = (select auth.uid())
      and (select private.can_access_core_resource('tasks', 'write', array['assigned']))
    )
  );
create policy rls_tasks_delete on public.tasks
  for delete to authenticated using (
    (select private.can_access_core_resource('tasks', 'delete', array['all']))
    or (
      creator_user_id = (select auth.uid())
      and (select private.can_access_core_resource('tasks', 'delete', array['own']))
    )
    or (
      assignee_user_id = (select auth.uid())
      and (select private.can_access_core_resource('tasks', 'delete', array['assigned']))
    )
  );

alter table public.comms enable row level security;
create policy rls_comms_select on public.comms
  for select to authenticated using (
    (select private.can_access_core_resource('comms', 'read', array['all']))
    or (
      access_owner_user_id = (select auth.uid())
      and (select private.can_access_core_resource('comms', 'read', array['own']))
    )
  );
create policy rls_comms_insert on public.comms
  for insert to authenticated with check (
    (select private.can_access_core_resource('comms', 'write', array['all']))
    or (
      access_owner_user_id = (select auth.uid())
      and (select private.can_access_core_resource('comms', 'write', array['own']))
    )
  );
create policy rls_comms_update on public.comms
  for update to authenticated using (
    (select private.can_access_core_resource('comms', 'write', array['all']))
    or (
      access_owner_user_id = (select auth.uid())
      and (select private.can_access_core_resource('comms', 'write', array['own']))
    )
  ) with check (
    (select private.can_access_core_resource('comms', 'write', array['all']))
    or (
      access_owner_user_id = (select auth.uid())
      and (select private.can_access_core_resource('comms', 'write', array['own']))
    )
  );
create policy rls_comms_delete on public.comms
  for delete to authenticated using (
    (select private.can_access_core_resource('comms', 'delete', array['all']))
    or (
      access_owner_user_id = (select auth.uid())
      and (select private.can_access_core_resource('comms', 'delete', array['own']))
    )
  );

-- Child data must not provide a direct route around a parent's RLS policy.
alter table public.tour_outline_days enable row level security;
create policy rls_tour_outline_days_select on public.tour_outline_days
  for select to authenticated using (
    private.can_access_tour_draft_record(draft_id, 'read')
  );
create policy rls_tour_outline_days_insert on public.tour_outline_days
  for insert to authenticated with check (
    private.can_access_tour_draft_record(draft_id, 'write')
  );
create policy rls_tour_outline_days_update on public.tour_outline_days
  for update to authenticated using (
    private.can_access_tour_draft_record(draft_id, 'write')
  ) with check (
    private.can_access_tour_draft_record(draft_id, 'write')
  );
create policy rls_tour_outline_days_delete on public.tour_outline_days
  for delete to authenticated using (
    private.can_access_tour_draft_record(draft_id, 'delete')
  );

alter table public.booking_changes enable row level security;
create policy rls_booking_changes_select on public.booking_changes
  for select to authenticated using (
    private.can_access_booking_record(booking_id, 'read')
  );
create policy rls_booking_changes_insert on public.booking_changes
  for insert to authenticated with check (
    private.can_access_booking_record(booking_id, 'write')
  );
create policy rls_booking_changes_update on public.booking_changes
  for update to authenticated using (
    private.can_access_booking_record(booking_id, 'write')
  ) with check (
    private.can_access_booking_record(booking_id, 'write')
  );
create policy rls_booking_changes_delete on public.booking_changes
  for delete to authenticated using (
    private.can_access_booking_record(booking_id, 'delete')
  );

alter table public.booking_itinerary enable row level security;
create policy rls_booking_itinerary_select on public.booking_itinerary
  for select to authenticated using (
    private.can_access_booking_record(booking_id, 'read')
  );
create policy rls_booking_itinerary_insert on public.booking_itinerary
  for insert to authenticated with check (
    private.can_access_booking_record(booking_id, 'write')
  );
create policy rls_booking_itinerary_update on public.booking_itinerary
  for update to authenticated using (
    private.can_access_booking_record(booking_id, 'write')
  ) with check (
    private.can_access_booking_record(booking_id, 'write')
  );
create policy rls_booking_itinerary_delete on public.booking_itinerary
  for delete to authenticated using (
    private.can_access_booking_record(booking_id, 'delete')
  );

alter table public.booking_activities enable row level security;
create policy rls_booking_activities_select on public.booking_activities
  for select to authenticated using (
    private.can_access_booking_activity_record(itinerary_id, 'read')
  );
create policy rls_booking_activities_insert on public.booking_activities
  for insert to authenticated with check (
    private.can_access_booking_activity_record(itinerary_id, 'write')
  );
create policy rls_booking_activities_update on public.booking_activities
  for update to authenticated using (
    private.can_access_booking_activity_record(itinerary_id, 'write')
  ) with check (
    private.can_access_booking_activity_record(itinerary_id, 'write')
  );
create policy rls_booking_activities_delete on public.booking_activities
  for delete to authenticated using (
    private.can_access_booking_activity_record(itinerary_id, 'delete')
  );

commit;
