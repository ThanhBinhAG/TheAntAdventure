begin;

-- Retire the unused Assigned data scope without deleting legacy rows. Legacy
-- rows stay inert and are retained unless an administrator replaces that exact
-- resource/action with an active Own or All scope.

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
    and rrs.scope in ('own', 'all')
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
  resulting_scopes jsonb;
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
      or scope not in ('own', 'all')
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
    replacement.resource_code,
    replacement.action,
    replacement.scope
  from (
    select
      legacy.resource_code,
      legacy.action,
      legacy.scope
    from jsonb_to_recordset(old_scopes)
      as legacy(resource_code text, action text, scope text)
    where legacy.scope = 'assigned'
      and not exists (
        select 1
        from jsonb_to_recordset(normalized_scopes)
          as requested(resource_code text, action text, scope text)
        where requested.resource_code = legacy.resource_code
          and requested.action = legacy.action
      )

    union all

    select
      requested.resource_code,
      requested.action,
      requested.scope
    from jsonb_to_recordset(normalized_scopes)
      as requested(resource_code text, action text, scope text)
  ) replacement;

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
  into resulting_scopes
  from public.role_resource_scopes
  where role_code = target_role_code;

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
      'scopes', resulting_scopes
    )
  );
end;
$function$;

revoke all on function public.list_access_control_staff_role_resource_scopes() from public;
revoke all on function public.replace_access_control_staff_role_resource_scopes(text, jsonb) from public;
grant execute on function public.list_access_control_staff_role_resource_scopes() to authenticated;
grant execute on function public.replace_access_control_staff_role_resource_scopes(text, jsonb) to authenticated;

drop function if exists public.set_core_record_assignee(text, text, uuid);

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
        and b.owner_user_id = (select auth.uid())
        and (select private.can_access_core_resource(
          'bookings', requested_action, array['own']
        ))
    );
$function$;

drop policy if exists rls_bookings_select on public.bookings;
drop policy if exists rls_bookings_insert on public.bookings;
drop policy if exists rls_bookings_update on public.bookings;
drop policy if exists rls_bookings_delete on public.bookings;

create policy rls_bookings_select on public.bookings
  for select to authenticated using (
    (select private.can_access_core_resource('bookings', 'read', array['all']))
    or (
      owner_user_id = (select auth.uid())
      and (select private.can_access_core_resource('bookings', 'read', array['own']))
    )
  );
create policy rls_bookings_insert on public.bookings
  for insert to authenticated with check (
    (select private.can_access_core_resource('bookings', 'write', array['all']))
    or (
      owner_user_id = (select auth.uid())
      and (select private.can_access_core_resource('bookings', 'write', array['own']))
    )
  );
create policy rls_bookings_update on public.bookings
  for update to authenticated using (
    (select private.can_access_core_resource('bookings', 'write', array['all']))
    or (
      owner_user_id = (select auth.uid())
      and (select private.can_access_core_resource('bookings', 'write', array['own']))
    )
  ) with check (
    (select private.can_access_core_resource('bookings', 'write', array['all']))
    or (
      owner_user_id = (select auth.uid())
      and (select private.can_access_core_resource('bookings', 'write', array['own']))
    )
  );
create policy rls_bookings_delete on public.bookings
  for delete to authenticated using (
    (select private.can_access_core_resource('bookings', 'delete', array['all']))
    or (
      owner_user_id = (select auth.uid())
      and (select private.can_access_core_resource('bookings', 'delete', array['own']))
    )
  );

drop policy if exists rls_tasks_select on public.tasks;
drop policy if exists rls_tasks_insert on public.tasks;
drop policy if exists rls_tasks_update on public.tasks;
drop policy if exists rls_tasks_delete on public.tasks;

create policy rls_tasks_select on public.tasks
  for select to authenticated using (
    (select private.can_access_core_resource('tasks', 'read', array['all']))
    or (
      creator_user_id = (select auth.uid())
      and (select private.can_access_core_resource('tasks', 'read', array['own']))
    )
  );
create policy rls_tasks_insert on public.tasks
  for insert to authenticated with check (
    (select private.can_access_core_resource('tasks', 'write', array['all']))
    or (
      creator_user_id = (select auth.uid())
      and (select private.can_access_core_resource('tasks', 'write', array['own']))
    )
  );
create policy rls_tasks_update on public.tasks
  for update to authenticated using (
    (select private.can_access_core_resource('tasks', 'write', array['all']))
    or (
      creator_user_id = (select auth.uid())
      and (select private.can_access_core_resource('tasks', 'write', array['own']))
    )
  ) with check (
    (select private.can_access_core_resource('tasks', 'write', array['all']))
    or (
      creator_user_id = (select auth.uid())
      and (select private.can_access_core_resource('tasks', 'write', array['own']))
    )
  );
create policy rls_tasks_delete on public.tasks
  for delete to authenticated using (
    (select private.can_access_core_resource('tasks', 'delete', array['all']))
    or (
      creator_user_id = (select auth.uid())
      and (select private.can_access_core_resource('tasks', 'delete', array['own']))
    )
  );

commit;
