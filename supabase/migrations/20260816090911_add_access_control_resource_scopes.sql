begin;

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

commit;
